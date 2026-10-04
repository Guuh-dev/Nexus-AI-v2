import { useEffect, useRef, useState } from "react";
import { Share, View } from "react-native";
import { useNexus } from "@/providers/NexusProvider";
import { journalSupported, saveJournal, readJournal, deleteJournal } from "@/services/journal.service";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { NexusText } from "@/components/ui/NexusText";
import { NexusButton } from "@/components/ui/NexusButton";
import { createId } from "@/utils/ids";
export function PrivateJournal() {
  const { data, saveJournalManifest, colors } = useNexus();
  const [supported, setSupported] = useState(false);
  const [text, setText] = useState(""); const [id, setId] = useState<string | undefined>();
  const draftId = useRef<string | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => { void journalSupported().then(setSupported); }, []);
  const action = async (work: () => Promise<void>) => { if (busy) return; setBusy(true); setMessage(""); try { await work(); } catch (e) { setMessage(e instanceof Error ? e.message : "Não foi possível confirmar a operação."); } finally { setBusy(false); } };
  return <Card style={{ gap: 12 }}><NexusText variant="title">Diário privado</NexusText><NexusText secondary>Separado da revisão. Texto criptografado neste aparelho, fora do backup JSON e sem envio à IA. Exportar compartilha uma cópia legível escolhida por você.</NexusText>
    {!supported ? <NexusText secondary>Disponível após atualizar o app Android com suporte ao diário protegido.</NexusText> : <>
      <Field label="Seu registro privado" value={text} onChangeText={setText} multiline maxLength={8000} editable={!busy} />
      <NexusButton label="Guardar no diário" loading={busy} disabled={!text.trim()} onPress={() => { void action(async () => { const chosen = id ?? draftId.current ?? createId("journal").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100); draftId.current = chosen; await saveJournal(chosen, text); if (!await saveJournalManifest(chosen, false)) throw new Error("O texto está protegido no aparelho, mas a lista não pôde ser atualizada. Tente novamente antes de sair."); setId(chosen); setMessage("Registro protegido e salvo."); }); }} />
      <NexusButton label="Novo registro" variant="ghost" disabled={busy} onPress={() => { draftId.current = undefined; setId(undefined); setText(""); }} />
      {(data.lockIn.journal ?? []).slice(-15).reverse().map((entry) => <View key={entry.id} style={{ gap: 6 }}><NexusButton label={`Abrir registro de ${new Date(entry.createdAt).toLocaleDateString("pt-BR")}`} compact variant="secondary" loading={busy} onPress={() => { void action(async () => { const content = await readJournal(entry.id); if (content === null) throw new Error("O conteúdo protegido não está neste aparelho. Restaurar JSON não recupera chaves ou diário de outro dispositivo."); setId(entry.id); setText(content); }); }} /></View>)}
      {id && <><NexusButton label="Exportar este registro legível" variant="secondary" disabled={busy} onPress={() => { void action(async () => { const content = await readJournal(id); if (content === null) throw new Error("Registro indisponível."); await Share.share({ message: content, title: "Meu diário Nexus" }); }); }} /><NexusButton label="Excluir este registro" variant="danger" loading={busy} onPress={() => setConfirmDelete(true)} /></>}
    </>}
    <ConfirmDialog visible={confirmDelete} title="Excluir este registro?" message="O texto protegido será removido deste aparelho. Cópias já exportadas continuam onde você as compartilhou." confirmLabel="Excluir" destructive loading={busy} onCancel={() => setConfirmDelete(false)} onConfirm={() => action(async () => { if (!id) return; await deleteJournal(id); if (!await saveJournalManifest(id, true)) throw new Error("Conteúdo excluído; tente novamente para retirar a referência."); draftId.current = undefined; setId(undefined); setText(""); setConfirmDelete(false); setMessage("Conteúdo e referência excluídos."); })} />
    {message && <NexusText color={colors.warning}>{message}</NexusText>}
  </Card>;
}
