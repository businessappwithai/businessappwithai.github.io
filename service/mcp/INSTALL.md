# Add AppWithAI to your own ChatGPT — until it is in the app directory

> The same steps, formatted for readers, are published at https://www.appwithai.org/chatgpt-app.html.

AppWithAI checks, repairs and audits an EML `.mmd` model inside ChatGPT. Until
the app is listed in OpenAI's directory, you can connect it to your own account
as a custom app in **developer mode**. It takes about two minutes and is private
to your account.

Names in ChatGPT's settings move around between releases. If a label below
differs slightly, look for the closest one.

## You need

- A ChatGPT plan that offers developer mode (Plus, Pro, Business or Enterprise;
  on Business and Enterprise an admin may have to allow it).
- ChatGPT on the web. Set it up there once; the app then also appears in the
  mobile app on the same account.
- This server address, which is public (ChatGPT's servers call it, so
  `localhost` will not work):

  ```
  https://appwithai-mcp.pramod-koshy.workers.dev/mcp
  ```

## Steps

1. Open ChatGPT in a browser and go to **Settings → Apps** (called
   **Connectors** in some versions).
2. Open **Advanced settings** and turn on **Developer mode**.
3. Choose **Create** (or **Add a custom app**) and fill in:
   - **Name:** AppWithAI
   - **Description:** Check, repair and audit AppWithAI EML models in ChatGPT
     without sending model contents to AppWithAI.
   - **MCP server URL:** the address above
   - **Authentication:** None
4. Tick the box that says you understand custom apps are unverified, then
   **Create**. ChatGPT lists two tools: `open_appwithai` and `get_eml_engine`.
5. Start a **new chat**. In the message box choose **+ → More** (or the
   developer-mode menu), pick **AppWithAI**, and send:

   > Open AppWithAI

## Using it

1. Attach your `.mmd` file to the chat. If you only have the text, paste it into
   the chat and ask ChatGPT to save it as a `.mmd` file.
2. Open AppWithAI. In the panel press **Choose a file from this chat** and pick
   the file.
3. The panel shows the verdict, the 22-point audit and every problem with its
   line. **Save the .mmd** puts the repaired copy back into the chat.

The panel does not have its own file picker or paste box in ChatGPT: the model
always comes from the chat.

## Privacy

AppWithAI's server never receives your model. The two tools take no input, the
checker runs in your browser, and the panel is only allowed to connect to
ChatGPT's own file hosts. `get_eml_engine` prints the EML version and the
SHA-256 of every file the panel runs, so you can compare them with
https://www.appwithai.org/guide/checker.js and the files beside it.

## If something is wrong

| What you see | What to do |
|---|---|
| No **Developer mode** switch | Your plan or workspace does not offer it; ask an admin or use the chat-only route on https://www.appwithai.org/try-it-yourself.html |
| ChatGPT cannot reach the server | Check the address ends in `/mcp`, then try it in a browser tab: a plain visit answers with an error, which is fine; a timeout is not |
| The panel opens but no file is listed | Attach the `.mmd` to the chat first, then press **Choose a file from this chat** again |
| A change on the site is not showing | Start a new chat; ChatGPT caches the panel per conversation |

To remove it: **Settings → Apps →** AppWithAI **→ Delete**.
