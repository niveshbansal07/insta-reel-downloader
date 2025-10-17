document.getElementById("pasteBtn").addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    document.getElementById("reelLink").value = text;
  } catch (err) {
    alert("Clipboard access denied. Please paste manually (Ctrl+V).");
  }
});

document.getElementById("downloadBtn").addEventListener("click", () => {
  const link = document.getElementById("reelLink").value.trim();
  if (!link) {
    alert("Please paste a valid Instagram reel link!");
    return;
  }
  // When backend ready, replace this alert with API call
  alert("Your reel will be downloaded in HD quality soon!");
});
