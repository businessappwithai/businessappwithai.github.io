/*
 * The two buttons under each worked example on try-it-yourself.html.
 *
 * Download is a plain link and needs nothing here. "Generate manual" compiles
 * the model with the same vendored generator chapter 09 uses and opens the
 * manual.html it writes in a new tab. No manual logic lives on this site: the
 * page is whatever generateFromSource returned. The bundle is large, so it is
 * imported on the first click, not on page load.
 */
let generator = null;

function show(win, html) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  win.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

document.querySelectorAll("[data-model-manual]").forEach((button) => {
  const label = button.textContent;
  button.addEventListener("click", async () => {
    // Opened synchronously so the click's permission to open a tab is not spent
    // waiting for the import and the fetch.
    const win = window.open("", "_blank");
    button.disabled = true;
    button.textContent = "Generating…";
    try {
      if (win) win.document.title = "Generating manual…";
      const [mod, source] = await Promise.all([
        generator || (generator = import("./appwithai-wasm.js")),
        fetch(button.dataset.modelPath).then((r) => {
          if (!r.ok) throw new Error(`Could not load the model (${r.status})`);
          return r.text();
        }),
      ]);
      const name = button.dataset.modelPath.split("/").pop().replace(/\.eml\.mmd$/, "");
      const { files } = mod.generateFromSource({ source, name, sampleRecords: 0 });
      const manual = files["manual.html"];
      if (!manual) throw new Error("The generator wrote no manual for this model.");
      if (!win) throw new Error("Your browser blocked the new tab. Allow pop-ups for this site and try again.");
      show(win, manual);
    } catch (err) {
      if (win) win.close();
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  });
});
