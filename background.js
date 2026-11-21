let pendingUpdate = Promise.resolve();

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== "update-bookmark") return;

  pendingUpdate = pendingUpdate
    .then(() => updateBookmark(tab?.url))
    .catch(error => console.error("无法显示书签更新状态", error));
});

async function updateBookmark(url) {
  let message;

  try {
    const { bookmarkId } = await chrome.storage.local.get("bookmarkId");

    if (!bookmarkId) {
      message = "请先在扩展弹窗中选择并保存一个书签";
    } else if (!/^https?:\/\//i.test(url ?? "")) {
      message = "请在普通 HTTP 或 HTTPS 网页中使用快捷键";
    } else {
      await chrome.bookmarks.update(bookmarkId, { url });
    }
  } catch (error) {
    console.warn("书签更新失败", error);
    message = "无法更新书签，请在弹窗中重新选择";
  }

  await Promise.all([
    chrome.action.setBadgeBackgroundColor({ color: message ? "#b91c1c" : "#15803d" }),
    chrome.action.setBadgeText({ text: message ? "ERR" : "OK" }),
    chrome.action.setTitle({ title: message ?? "一键更新书签 · 网址已更新" })
  ]);
}
