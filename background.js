const badgeDurationMs = 4000;
const defaultTitle = chrome.runtime.getManifest().action.default_title;
let pendingUpdate = Promise.resolve();
let badgeTimeout;

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== "update-bookmark") return;

  pendingUpdate = pendingUpdate
    .then(() => updateBookmark(tab?.url))
    .catch(error => console.error("无法显示书签更新状态", error));
});

async function updateBookmark(url) {
  if (badgeTimeout !== undefined) {
    await clearBadge().catch(error => console.warn("无法清除上次更新状态", error));
  }

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
    chrome.action.setTitle({ title: message ?? `${defaultTitle} · 网址已更新` })
  ]);

  const timeout = setTimeout(() => {
    pendingUpdate = pendingUpdate
      .then(() => {
        if (badgeTimeout === timeout) return clearBadge();
      })
      .catch(error => console.error("无法清除书签更新状态", error));
  }, badgeDurationMs);
  badgeTimeout = timeout;
}

async function clearBadge() {
  clearTimeout(badgeTimeout);
  badgeTimeout = undefined;
  await Promise.all([
    chrome.action.setBadgeText({ text: "" }),
    chrome.action.setTitle({ title: defaultTitle })
  ]);
}
