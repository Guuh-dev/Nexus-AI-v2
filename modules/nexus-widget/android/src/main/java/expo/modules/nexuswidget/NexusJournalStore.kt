package expo.modules.nexuswidget

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import java.io.File
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Private journal: Android Keystore AES-GCM, authenticated ID, no plaintext files. */
object NexusJournalStore {
  private const val ALIAS = "nexus-private-journal-v1"
  private fun key(): SecretKey {
    val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    (store.getKey(ALIAS, null) as? SecretKey)?.let { return it }
    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
    generator.init(KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
      .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
      .setKeySize(256).build())
    return generator.generateKey()
  }
  private fun file(context: Context, id: String): File {
    require(id.matches(Regex("^[a-zA-Z0-9_-]{1,100}$"))) { "Invalid journal ID" }
    val directory = File(context.noBackupFilesDir, "nexus-journal").apply { mkdirs() }
    return File(directory, "$id.enc")
  }
  @Synchronized fun save(context: Context, id: String, text: String) {
    val clear = text.toByteArray(Charsets.UTF_8)
    require(clear.size <= 32_768) { "Journal entry is too large" }
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.ENCRYPT_MODE, key())
    cipher.updateAAD(id.toByteArray(Charsets.UTF_8))
    val encrypted = cipher.doFinal(clear)
    val atomic = AtomicFile(file(context, id))
    val stream = atomic.startWrite()
    try { stream.write(byteArrayOf(1, cipher.iv.size.toByte())); stream.write(cipher.iv); stream.write(encrypted); atomic.finishWrite(stream) }
    catch (error: Exception) { atomic.failWrite(stream); throw error }
  }
  @Synchronized fun read(context: Context, id: String): String? {
    val source = file(context, id)
    val backup = File(source.path + ".bak")
    if (!source.exists() && !backup.exists()) return null
    require(maxOf(source.length(), backup.length()) <= 33_000) { "Invalid encrypted journal size" }
    val bytes = AtomicFile(source).readFully()
    require(bytes.size > 14 && bytes[0].toInt() == 1 && bytes[1].toInt() == 12) { "Invalid encrypted journal format" }
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(2, 14)))
    cipher.updateAAD(id.toByteArray(Charsets.UTF_8))
    return String(cipher.doFinal(bytes.copyOfRange(14, bytes.size)), Charsets.UTF_8)
  }
  @Synchronized fun delete(context: Context, id: String) {
    val target = file(context, id)
    AtomicFile(target).delete()
    check(!target.exists() && !File(target.path + ".bak").exists()) { "Unable to delete encrypted journal" }
  }
  @Synchronized fun clear(context: Context) {
    check(File(context.noBackupFilesDir, "nexus-journal").deleteRecursively()) { "Unable to clear encrypted journal" }
    KeyStore.getInstance("AndroidKeyStore").apply { load(null); if (containsAlias(ALIAS)) deleteEntry(ALIAS) }
  }
}
