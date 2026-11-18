/**
 * Clear persistent Cloud chat history first (when signed in) and only reset
 * local UI state if the remote delete operation succeeds cleanly.
 */
export async function clearConversationHistory({
  userId,
  deleteRemoteMessages,
  onLocalReset,
}) {
  if (userId) {
    const res = await deleteRemoteMessages(userId);
    if (res?.error) {
      throw new Error(
        res.error.message || "Gagal menghapus riwayat percakapan di cloud."
      );
    }
  }
  onLocalReset();
}
