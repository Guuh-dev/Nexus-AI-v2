import { useEffect, useRef, useState } from "react";
import Svg, { Circle } from "react-native-svg";
import { AppState, View } from "react-native";
import { Tabs, useLocalSearchParams } from "expo-router";
import { useAudioPlayer } from "expo-audio";
import { Card } from "@/components/ui/Card";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { Field } from "@/components/ui/Field";
import { NexusButton } from "@/components/ui/NexusButton";
import { NexusText } from "@/components/ui/NexusText";
import { Screen } from "@/components/ui/Screen";
import { CompanionMascot } from "@/components/CompanionMascot";
import { Badge, ScreenHeader, SectionHeader } from "@/components/ui/Layout";
import { useNexus } from "@/providers/NexusProvider";
import { clearFocusRuntime, loadFocusRuntime, saveFocusRuntime, focusRuntimeEpoch, type FocusRuntime } from "@/services/focus-runtime.service";
import { capacity, wallStamp } from "@/features/lock-in/planning";
import { addDays, localDateKey } from "@/utils/dates";
import { elapsedAt, resumeRuntime, stopRuntime, scheduledPauseAt } from "@/features/focus/runtime";
import { ambientSoundUri } from "@/services/ambient-sound.service";
import { updateAndroidWidget } from "@/services/widget.service";
import { createId } from "@/utils/ids";
import type { AmbientSound, FocusMode, FocusSession } from "@/types";
import { focusXpForSeconds } from "@/utils/levels";
export { RouteErrorBoundary as ErrorBoundary } from "@/components/ErrorBoundary";
const modes: [FocusMode, string, number][] = [["profundo", "Deep Session", 50], ["sprint", "Sprint", 15], ["pomodoro", "Pomodoro", 25], ["fluxo", "Fluxo", 90], ["personalizado", "Personalizado", 25]];
const sounds: [AmbientSound, string][] = [["nenhum", "Silêncio"], ["chuva", "Chuva"], ["floresta", "Floresta"], ["cafeteria", "Cafeteria"], ["ruido_marrom", "Ruído marrom"], ["ruido_branco", "Ruído branco"], ["espaco", "Espaço"]];
const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
export default function FocusScreen() {
  const { data, colors, finishFocusSession } = useNexus();
  const params = useLocalSearchParams<{ taskId?: string }>();
  const [runtime, setRuntime] = useState<FocusRuntime | null>(null);
  const latest = useRef<FocusRuntime | null>(null);
  const locked = useRef(false);
  const currentData = useRef(data); currentData.current = data;
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(Date.now());
  const [taskId, setTaskId] = useState<string | undefined>(params.taskId ?? data.activePlan?.tasks.find((t) => !t.completed)?.id);
  const [mode, setMode] = useState<FocusMode>("profundo");
  const [duration, setDuration] = useState(() => String(data.activePlan?.tasks.find((t) => t.id === (params.taskId ?? data.activePlan?.tasks.find((task) => !task.completed)?.id))?.estimatedMinutes ?? data.profile?.evolution?.sessionLength ?? 25));
  const [intention, setIntention] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [reflection, setReflection] = useState("");
  const [capture, setCapture] = useState("");
  const [returnAt, setReturnAt] = useState("");
  const [sound, setSound] = useState<AmbientSound>("nenhum");
  const player = useAudioPlayer(null);
  const task = data.activePlan?.tasks.find((t) => t.id === taskId);
  const publish = (r: FocusRuntime | null) => { latest.current = r; setRuntime(r); };
  const operation = async (make: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError("");
    try { await make(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível gravar. Tente novamente."); }
    finally { locked.current = false; setBusy(false); }
  };
  const persist = async (r: FocusRuntime) => { await saveFocusRuntime(r); publish(r); setTick(Date.now()); void updateAndroidWidget(currentData.current); };
  useEffect(() => {
    let mounted = true;
    void loadFocusRuntime().then((r) => { if (!mounted) return; publish(r); setNextAction(r?.nextAction ?? ""); setReflection(r?.reflection ?? ""); setReturnAt(r?.returnAt ? new Date(r.returnAt).toLocaleTimeString("pt-BR", { timeZone: currentData.current.profile?.timezone, hour: "2-digit", minute: "2-digit" }) : ""); setLoaded(true); }).catch(() => { if (mounted) { setError("O registro de foco não pôde ser recuperado. Ele foi preservado; tente reabrir o app antes de iniciar outra sessão."); } });
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (typeof params.taskId === "string" && !latest.current) {
      setTaskId(params.taskId);
      const selected = currentData.current.activePlan?.tasks.find((t) => t.id === params.taskId);
      if (selected) setDuration(String(selected.estimatedMinutes));
    }
  }, [params.taskId]);
  useEffect(() => {
    const ticker = setInterval(() => { if (latest.current && latest.current.epoch !== undefined && latest.current.epoch !== focusRuntimeEpoch()) { publish(null); setError("O estado foi substituído. A sessão anterior foi encerrada pelo reset ou importação."); } setTick(Date.now()); }, 500);
    const checkpoint = setInterval(() => {
      if (!latest.current || latest.current.status !== "running" || locked.current) return;
      locked.current = true;
      const r = { ...latest.current, lastObservedAt: Date.now() };
      void saveFocusRuntime(r).then(() => publish(r)).catch(() => setError("Não foi possível salvar o checkpoint. Pause e tente novamente.")).finally(() => { locked.current = false; });
    }, 5000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" || !latest.current || latest.current.status !== "running" || locked.current) return;
      void operation(() => persist(stopRuntime(latest.current!, "paused")));
    });
    return () => { clearInterval(ticker); clearInterval(checkpoint); subscription.remove(); };
    // Runtime writes use refs to serialize against actions and checkpoint updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    let cancelled = false;
    if (runtime?.status !== "running" || !data.preferences.sound || runtime.ambientSound === "nenhum") { player.pause(); return; }
    void ambientSoundUri(runtime.ambientSound).then((uri) => { if (!uri || cancelled) return; player.replace(uri); player.loop = true; player.volume = 0.28; player.play(); }).catch(() => setError("Não foi possível reproduzir o som. A sessão continua em silêncio."));
    return () => { cancelled = true; player.pause(); };
  }, [runtime?.status, runtime?.ambientSound, data.preferences.sound, player]);
  const now = tick;
  const availability = data.lockIn.execution;
  const protectedNow = availability?.reservations.some((s) => Date.parse(s.start) <= now && Date.parse(s.end) > now) ?? false;
  const currentWindow = availability ? capacity(availability, new Date(now)).free.find((s) => s.start <= now && s.end > now) : undefined;
  const outsideWindow = Boolean(availability && !currentWindow);
  const returnStamp = () => {
    if (!returnAt) return undefined;
    const zone = currentData.current.profile?.timezone ?? "UTC", date = localDateKey(new Date(), zone);
    const today = wallStamp(date, returnAt, zone);
    return Date.parse(today) > Date.now() ? today : wallStamp(addDays(date, 1), returnAt, zone);
  };
  const active = runtime?.status === "running";
  const elapsed = runtime ? elapsedAt(runtime, tick) : 0;
  const targetReached = Boolean(runtime && elapsed >= runtime.duration * 60);
  useEffect(() => {
    const r = latest.current;
    if (!r || r.status !== "running" || locked.current) return;
    const execution = currentData.current.lockIn.execution;
    const authorized = execution && r.runStartedAt !== null ? capacity(execution, new Date(r.runStartedAt)).free.find((s) => s.start <= r.runStartedAt! && s.end > r.runStartedAt!) : undefined;
    const pauseAt = scheduledPauseAt(r, tick, execution ? authorized?.end ?? tick : undefined);
    if (pauseAt !== undefined) void operation(() => persist(stopRuntime(r, "paused", pauseAt)));
    // Refs and the operation lock serialize the boundary with checkpoint writes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, runtime]);
  const start = () => operation(async () => {
    const minutes = Number(duration);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 360) throw new Error("Escolha um alvo de 5 a 360 minutos.");
    if (protectedNow || outsideWindow) throw new Error("Escolha uma janela autorizada disponível no Plano antes de iniciar.");
    if (currentWindow && currentWindow.end - Date.now() < minutes * 60_000) throw new Error("O alvo não cabe na janela atual sem usar reservas. Escolha um alvo menor ou revise o Plano.");
    const now = Date.now();
    await persist({ epoch: focusRuntimeEpoch(), version: 2, sessionId: createId("focus-session"), ...(taskId ? { taskId } : {}), taskTitle: task?.title ?? "Sessão livre", duration: minutes, mode, intention, ambientSound: sound, status: "running", elapsedBase: 0, runStartedAt: now, sessionStartedAt: new Date(now).toISOString(), segments: [], inbox: [], lastObservedAt: now });
  });
  const pause = () => operation(() => persist({ ...stopRuntime(latest.current!, "paused"), nextAction, returnAt: returnStamp() }));
  const resume = () => operation(async () => {
    if (protectedNow || outsideWindow) throw new Error("A retomada precisa de uma janela autorizada disponível. Revise o Plano.");
    await persist(resumeRuntime({ ...latest.current!, nextAction, reflection, targetAcknowledged: latest.current!.targetAcknowledged || targetReached }));
  });
  const complete = (markTaskComplete: boolean, cancelled = false) => operation(async () => {
    let r = latest.current!;
    if (r.status !== "completed") { r = { ...stopRuntime(r, "completed"), reflection, nextAction }; await persist(r); }
    r = { ...r, reflection, nextAction }; await persist(r);
    const session: FocusSession = { id: r.sessionId, taskId: r.taskId, taskTitle: r.taskTitle, plannedMinutes: r.duration, elapsedSeconds: r.elapsedBase, xp: cancelled ? 0 : focusXpForSeconds(r.elapsedBase), status: cancelled ? "cancelled" : "completed", startedAt: r.sessionStartedAt, completedAt: new Date().toISOString(), mode: r.mode, intention: r.intention, reflection: r.reflection, ambientSound: r.ambientSound, segments: r.segments, nextAction: r.nextAction, captures: r.inbox };
    if (!await finishFocusSession(session, markTaskComplete)) throw new Error("A sessão ainda não foi salva. O registro local foi mantido para tentar novamente.");
    await clearFocusRuntime(); publish(null); void updateAndroidWidget(currentData.current); setReflection(""); setCapture("");
  });
  return <><Tabs.Screen options={{ tabBarStyle: active ? { display: "none" } : undefined }} /><Screen><View style={{ gap: 18, paddingBottom: 24 }}>
    <ScreenHeader eyebrow="Foco" title="Uma intenção. Um passo." trailing={<CompanionMascot mascot="nexus" state={runtime?.status === "paused" ? "sleeping" : runtime ? "thinking" : "idle"} size={56} />} />
    {error && <Card tone="danger"><NexusText color={colors.danger}>{error}</NexusText></Card>}
    {!loaded && <NexusText secondary>Recuperando sua sessão…</NexusText>}
    {loaded && !runtime && <>
      {outsideWindow && <Card tone="warning"><NexusText color={colors.warning}>Sem janela autorizada agora. Confirme sua disponibilidade no Plano para iniciar.</NexusText></Card>}
      <Card style={{ gap: 14 }}><NexusText variant="eyebrow" secondary>Ritmo</NexusText><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{modes.map(([id, title, min]) => <ChoiceChip key={id} label={title} selected={mode === id} onPress={() => { setMode(id); setDuration(String(min)); }} />)}</View><Field label="Alvo em minutos" value={duration} onChangeText={setDuration} keyboardType="number-pad" maxLength={3} /><NexusText variant="caption" secondary>A sessão pausa no alvo. Você pode continuar voluntariamente dentro da janela autorizada, mantendo o tempo real registrado.</NexusText></Card>
      <Card style={{ gap: 10 }}><NexusText variant="eyebrow" secondary>Onde avançar?</NexusText>{data.activePlan?.tasks.filter((t) => !t.completed).map((t) => <ChoiceChip key={t.id} label={t.title} selected={taskId === t.id} onPress={() => setTaskId(t.id)} />)}<ChoiceChip label="Sessão livre" selected={!taskId} onPress={() => setTaskId(undefined)} />{task?.firstStep && <NexusText variant="caption" secondary>Comece por: {task.firstStep}</NexusText>}</Card>
      <Field label="Resultado esperado da sessão" value={intention} onChangeText={setIntention} multiline maxLength={300} />
      {data.preferences.sound && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{sounds.map(([id, title]) => <ChoiceChip key={id} label={title} selected={sound === id} onPress={() => setSound(id)} />)}</View>}
      <NexusButton label="Iniciar foco" loading={busy} disabled={!loaded || protectedNow || outsideWindow} onPress={() => { void start(); }} />
    </>}
    {runtime && <>
      <Card elevated style={{ gap: 14, alignItems: "center", paddingVertical: 24 }}><Badge label={runtime.status === "running" ? "Sessão em andamento" : runtime.status === "paused" ? "Sessão pausada" : "Revise a entrega"} color={runtime.status === "paused" ? colors.warning : colors.primarySoft} /><NexusText variant="title">{runtime.taskTitle}</NexusText><View style={{ width: 240, height: 240, alignItems: "center", justifyContent: "center" }}><Svg width={240} height={240} style={{ position: "absolute" }}><Circle cx={120} cy={120} r={108} fill="none" stroke={colors.border} strokeWidth={6} /><Circle cx={120} cy={120} r={108} fill="none" stroke={runtime.status === "paused" ? colors.success : colors.primary} strokeWidth={6} strokeLinecap="round" strokeDasharray={2 * Math.PI * 108} strokeDashoffset={2 * Math.PI * 108 * (1 - Math.min(1, elapsed / (runtime.duration * 60)))} rotation={-90} origin="120,120" /></Svg><NexusText variant="display" style={{ fontSize: 52, lineHeight: 62, letterSpacing: -2, fontVariant: ["tabular-nums"] }}>{clock(elapsed)}</NexusText><NexusText variant="eyebrow" secondary>Tempo registrado</NexusText></View><NexusText secondary>Tempo registrado · alvo {runtime.duration} min · pausas excluídas</NexusText>{runtime.recovery && <NexusText color={colors.warning}>Retomamos o último checkpoint salvo. O intervalo sem registro permanece desconhecido. Confirme para continuar.</NexusText>}{runtime.intention && <NexusText secondary>{runtime.intention}</NexusText>}
      {targetReached && runtime.status === "paused" && <NexusText color={colors.success}>Alvo alcançado. Continue voluntariamente ou revise a entrega.</NexusText>}
      {(protectedNow || outsideWindow) && <NexusText color={colors.warning}>A janela autorizada terminou ou há uma reserva protegida. Pause e revise sua disponibilidade.</NexusText>}
      {runtime.status === "running" && <NexusButton label="Pausar" loading={busy} onPress={() => { void pause(); }} fullWidth />}
      {runtime.status === "paused" && <NexusButton label={targetReached ? "Continuar além do alvo" : "Retomar"} loading={busy} disabled={protectedNow || outsideWindow} onPress={() => { void resume(); }} fullWidth />}
      {runtime.status !== "completed" && <NexusButton label="Finalizar e revisar" variant="secondary" loading={busy} onPress={() => { void operation(() => persist(stopRuntime(latest.current!, "completed"))); }} fullWidth />}</Card>
      {runtime.status === "paused" && <><Field label="Onde retomar?" value={nextAction} onChangeText={setNextAction} multiline maxLength={300} /><Field label="Retorno previsto opcional (HH:MM)" hint="Seu fuso do perfil; se o horário já passou, consideramos amanhã." value={returnAt} onChangeText={setReturnAt} maxLength={5} /><NexusButton label="Guardar ponto de retomada" variant="secondary" loading={busy} onPress={() => { void operation(async () => { const stamp = returnStamp(); await persist({ ...latest.current!, nextAction, returnAt: stamp }); }); }} /></>}
      <SectionHeader title="Inbox de distrações" /><Card style={{ gap: 10 }}><NexusText secondary>Guarde a ideia e volte à missão. Ela não vira uma tarefa automaticamente.</NexusText><Field label="Captura rápida" value={capture} onChangeText={setCapture} maxLength={300} /><NexusButton label="Guardar ideia" variant="secondary" disabled={!capture.trim() || busy} onPress={() => { void operation(async () => { if ((latest.current!.inbox?.length ?? 0) >= 100) throw new Error("Revise a inbox antes de guardar outra ideia."); await persist({ ...latest.current!, inbox: [...(latest.current!.inbox ?? []), { id: createId("capture"), text: capture.trim(), createdAt: new Date().toISOString() }] }); setCapture(""); }); }} />{runtime.inbox?.map((c) => <NexusText key={c.id} secondary>• {c.text}</NexusText>)}</Card>
      {runtime.status === "completed" && <Card style={{ gap: 12 }}><NexusText variant="title">O que ficou pronto?</NexusText><Field label="Evidência ou relato da entrega" value={reflection} onChangeText={setReflection} multiline maxLength={500} /><Field label="Próxima ação, se ficou parcial" value={nextAction} onChangeText={setNextAction} multiline maxLength={300} /><NexusText secondary>Tempo registrado não comprova conclusão. Confirme a tarefa apenas se seu critério foi atendido.</NexusText><NexusButton label="Salvar sessão e concluir tarefa" disabled={!runtime.taskId || busy} loading={busy} onPress={() => { void complete(true); }} /><NexusButton label="Salvar avanço parcial" variant="secondary" loading={busy} onPress={() => { void complete(false); }} /><NexusButton label="Registrar cancelamento" variant="ghost" loading={busy} onPress={() => { void complete(false, true); }} /></Card>}
    </>}
  </View></Screen></>;
}
