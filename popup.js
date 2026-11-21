const settings = document.querySelector("#settings");
const select = document.querySelector("#bookmarks");
const save = document.querySelector("#save");
const status = document.querySelector("#status");
const shortcut = document.querySelector("#shortcut");
let savedId;

function addBookmarks(nodes, path = []) {
  for (const node of nodes) {
    if (node.unmodifiable) continue;

    if (node.url) {
      const label = [...path, node.title || node.url].join(" / ");
      const option = new Option(label, node.id);
      option.dataset.url = node.url;
      option.dataset.lastUsed = node.dateLastUsed ?? 0;
      select.add(option);
    } else if (node.children) {
      addBookmarks(node.children, node.title ? [...path, node.title] : path);
    }
  }
}

function showSelection() {
  const selected = select.selectedOptions[0];
  const isSaved = Boolean(select.value) && select.value === savedId;
  save.disabled = !select.value || isSaved;
  save.textContent = isSaved ? "已保存" : "保存选择";

  if (select.value) {
    status.textContent = isSaved
      ? `已选定：${selected.textContent}`
      : "点击「保存选择」以绑定此书签。";
  } else {
    status.textContent = "请选择一个用于记录进度的书签。";
  }
}

async function loadBookmarks() {
  try {
    const [tree, { bookmarkId }, [tab]] = await Promise.all([
      chrome.bookmarks.getTree(),
      chrome.storage.local.get("bookmarkId"),
      chrome.tabs.query({ active: true, currentWindow: true }).catch(error => {
        console.warn("无法读取当前标签页", error);
        return [];
      })
    ]);
    savedId = bookmarkId;
    addBookmarks(tree);

    if (select.options.length === 1) {
      status.textContent = savedId
        ? "原书签已删除或不可编辑。请先在 Chrome 中添加一个书签。"
        : "当前没有可编辑的书签。请先在 Chrome 中添加一个书签。";
      return;
    }

    select.disabled = false;
    const matches = Array.from(select.options)
      .filter(option => option.dataset.url === tab?.url && option.value)
      .sort((a, b) => Number(b.dataset.lastUsed) - Number(a.dataset.lastUsed));
    const [latestMatch, nextMatch] = matches;

    if (latestMatch) {
      if (latestMatch.dataset.lastUsed === nextMatch?.dataset.lastUsed) {
        status.textContent = "有多个书签指向当前网页，请选择要更新的书签。";
        return;
      }

      select.value = latestMatch.value;
      showSelection();
      if (select.value !== savedId) {
        status.textContent = "已匹配当前网页。点击「保存选择」以绑定此书签。";
      }
      return;
    }

    if (savedId) select.value = savedId;

    if (select.selectedIndex === -1) {
      select.value = "";
      status.textContent = "原书签已删除或不可编辑，请重新选择。";
    } else {
      showSelection();
    }
  } catch (error) {
    console.warn("无法读取书签", error);
    status.textContent = "无法读取书签，请重新打开扩展弹窗。";
  }
}

async function showShortcut() {
  try {
    const commands = await chrome.commands.getAll();
    const binding = commands.find(command => command.name === "update-bookmark")?.shortcut;
    if (binding) {
      const key = document.createElement("kbd");
      key.textContent = binding.replaceAll("+", " + ");
      shortcut.replaceChildren(key);
    } else {
      shortcut.textContent = "尚未绑定";
    }
  } catch (error) {
    console.warn("无法读取快捷键", error);
    shortcut.textContent = "请在 Chrome 中查看当前快捷键。";
  }
}

select.addEventListener("change", showSelection);

settings.addEventListener("submit", async event => {
  event.preventDefault();
  if (save.disabled) return;

  const bookmarkId = select.value;
  select.disabled = true;
  save.disabled = true;

  try {
    await chrome.storage.local.set({ bookmarkId });
    savedId = bookmarkId;
    showSelection();
  } catch (error) {
    console.warn("无法保存书签选择", error);
    status.textContent = "保存失败，请重试。";
    save.disabled = false;
  } finally {
    select.disabled = false;
  }
});

document.querySelector("#configure-shortcut").addEventListener("click", async event => {
  event.preventDefault();
  try {
    await chrome.tabs.create({ url: event.currentTarget.href });
  } catch (error) {
    console.warn("无法打开快捷键设置", error);
    shortcut.textContent = "请在地址栏手动打开 chrome://extensions/shortcuts。";
  }
});

loadBookmarks();
showShortcut();
