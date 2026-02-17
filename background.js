const DEFAULT_TEMPLATE = "- [{subject}]({id}) - [[{date}]] by [{sender_name}]({sender_email}) to {receiver}";

async function getFormatTemplate() {
  const data = await browser.storage.local.get("formatTemplate");
  return data.formatTemplate || DEFAULT_TEMPLATE;
}

function formatDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayName = days[dateObj.getDay()];
  return `${y}-${m}-${d} ${dayName}`;
}

function parseContact(contactString) {
  if (!contactString) return { name: "Unknown", email: "unknown" };
  const match = contactString.match(/(.*)<(.*)>/);
  if (match) {
    let name = match[1].trim();
    const email = match[2].trim();
    if (name.startsWith('"') && name.endsWith('"')) {
      name = name.slice(1, -1);
    }
    return { name: name || email, email: email };
  }
  return { name: contactString, email: contactString };
}

function escapeMarkdown(text) {
  if (!text) return "";
  return text.replace(/([\\\[\]*_\`~<>])/g, "\\$1");
}

async function formatMessage(message, template) {
  const dateObj = new Date(message.date);
  const formattedDate = formatDate(dateObj);
  const author = parseContact(message.author);
  
  let recipients = "";
  if (Array.isArray(message.recipients)) {
    recipients = message.recipients.join(", ");
  } else {
    recipients = message.recipients || "";
  }

  const safeSubject = escapeMarkdown(message.subject);
  const safeSenderName = escapeMarkdown(author.name);
  const safeReceiver = escapeMarkdown(recipients);

  return template
    .replace(/{subject}/g, safeSubject)
    .replace(/{id}/g, message.headerMessageId)
    .replace(/{date}/g, formattedDate)
    .replace(/{sender_name}/g, safeSenderName)
    .replace(/{sender_email}/g, author.email)
    .replace(/{receiver}/g, safeReceiver)
    .replace(/{newline}/g, "\n");
}

function copyToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand("copy");
  } catch (err) {
    console.error(err);
  }
  document.body.removeChild(textArea);
}

async function handleCopy(tab) {
  if (!tab || !tab.id) return;
  
  try {
    const template = await getFormatTemplate();
    let messages = [];

    const selection = await browser.mailTabs.getSelectedMessages(tab.id);
    if (selection && selection.messages && selection.messages.length > 0) {
      messages = selection.messages;
    } else {
      const displayed = await browser.messageDisplay.getDisplayedMessage(tab.id);
      if (displayed) {
        messages = [displayed];
      }
    }

    if (messages.length === 0) return;

    const clipboardParts = [];
    for (const msg of messages) {
      const formatted = await formatMessage(msg, template);
      clipboardParts.push(formatted);
    }

    const finalString = clipboardParts.join("\n");
    
    try {
      await navigator.clipboard.writeText(finalString);
    } catch (e) {
      copyToClipboard(finalString);
    }
    
  } catch (err) {
    console.error(err);
  }
}

browser.menus.create({
  id: "copy-context-menu",
  title: "Copy Message Context",
  contexts: ["message_list", "page"]
}, () => {
  const err = browser.runtime.lastError;
});

browser.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "copy-context-menu") {
    handleCopy(tab);
  }
});

browser.commands.onCommand.addListener((command, tab) => {
  if (command === "copy_message_context") {
    handleCopy(tab);
  }
});
