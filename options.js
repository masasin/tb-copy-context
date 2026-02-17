const DEFAULT_TEMPLATE = "[{subject}]({id}) - [[{date}]] by [{sender_name}]({sender_email}) to {receiver}";

function saveOptions() {
  const template = document.querySelector("#template").value;
  browser.storage.local.set({
    formatTemplate: template
  });
  
  const status = document.getElementById("status");
  status.textContent = "Saved!";
  setTimeout(() => {
    status.textContent = "";
  }, 1000);
}

function restoreOptions() {
  browser.storage.local.get("formatTemplate").then((res) => {
    document.querySelector("#template").value = res.formatTemplate || DEFAULT_TEMPLATE;
  });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("save").addEventListener("click", saveOptions);
