# How to run Pocket Agents on your laptop (no installs needed)

This uses **GitHub Codespaces** — it runs everything in your web browser, so
you don't need to install anything on your work PC.

## One-time setup

1. Go to **github.com** and sign in (create a free account if you don't have one).
2. Open this repository in your browser.
3. Make sure you're on the branch named **`claude/gracious-dirac-xauumr`**
   (there's a branch dropdown near the top-left of the file list — click it and pick that name).
4. Click the green **`< > Code`** button.
5. Click the **Codespaces** tab.
6. Click **Create codespace on claude/gracious-dirac-xauumr**.

A code editor will open in your browser. Wait a few minutes — it's setting
everything up for you automatically (you'll see it working at the bottom).
It's done when the messages stop.

## Start the app

1. At the bottom of the screen, click the **Terminal** tab (if you don't see it,
   press `` Ctrl + ` `` — that's the key above Tab).
2. Type this and press Enter:

   ```
   cd pocket-agents && npm start
   ```

3. A pop-up will appear saying the app is running on a port — click
   **Open in Browser**. (If it doesn't pop up, click the **Ports** tab next to
   Terminal, then click the 🌐 globe icon next to port 3001.)

That's it — create an account in the app and hire your first agent.

## Real AI answers (optional)

Out of the box the app runs in **demo mode** — everything works, but the agents'
answers are placeholders. To get real AI answers you need an Anthropic API key:

1. Get a key from **console.anthropic.com**.
2. In the terminal, before running `npm start`, type this (paste your real key):

   ```
   export ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

3. Then run `npm start` as above.

## Notes

- To stop the app: click the terminal and press `Ctrl + C`.
- To start it again later: re-open the codespace from github.com, open the
  terminal, and run `cd pocket-agents && npm start`.
- Codespaces is free for personal use up to a monthly limit — plenty for testing.
