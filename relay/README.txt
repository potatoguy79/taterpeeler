TaterPeeler's backup route (the relay)
======================================

Why: some networks (schools with iBoss and other filters) block the game's server, Supabase, so online features
(cloud saves, leaderboards, lobbies, messages) don't work there. Those networks still let the website through, and
they nearly always let Google through. The relay is a tiny script that runs on Google: the game sends its online
calls to it, it passes them on to Supabase, and hands the answers back. The game only uses it when it can't reach
Supabase itself, so everyone else keeps the direct (faster) route.

It keeps nothing and only passes on the game's own tp_* calls, with the same public key that's already in the game.


Set it up on Google (about 5 minutes, free)
-------------------------------------------
Use a personal Google account (a school account may not be allowed to make public web apps).

 1. Go to https://script.google.com and press "New project".
 2. Delete the few lines that are already there, and paste in everything from Code.gs (next to this file).
 3. Press the floppy-disk icon (Save). Name the project "TaterPeeler relay" if it asks.
 4. Press "Deploy" (top right) -> "New deployment".
 5. Next to "Select type" press the gear and pick "Web app".
 6. Set "Execute as" to "Me", and "Who has access" to "Anyone". Press "Deploy".
 7. Google asks you to authorize it: press "Authorize access", pick your account. It warns that Google hasn't
    verified the app (it's your own script): press "Advanced" -> "Go to TaterPeeler relay (unsafe)" -> "Allow".
    (It asks for "Connect to an external service": that's how it reaches Supabase.)
 8. Copy the "Web app" URL. It looks like https://script.google.com/macros/s/AKfycb.../exec
 9. Open that URL in a browser: it should say "The TaterPeeler relay is running."
10. On GitHub, open events.txt (at the top of the repository), tap the pencil, and paste the URL after relay:
        relay: https://script.google.com/macros/s/AKfycb.../exec
    then "Commit changes". The game picks it up within a few minutes, on the website and in the apps.

If you ever change Code.gs: Deploy -> Manage deployments -> pencil -> Version: "New version" -> Deploy. (The URL
stays the same.)

Limits: Google lets a free account make about 20,000 of these calls a day. While someone plays through the relay,
the game calls less often than usual (lobbies a bit slower, messages every 15 seconds) to stay well under that.


A second route (optional): Cloudflare
-------------------------------------
If Google is blocked somewhere too, a Cloudflare Worker can be another route (100,000 calls a day free):
 1. Make a free account at https://dash.cloudflare.com, go to Workers & Pages -> Create -> Create Worker.
 2. Name it "taterpeeler-relay", Deploy, then "Edit code": replace everything with worker.js, and Deploy again.
 3. Its address looks like https://taterpeeler-relay.yourname.workers.dev
 4. Put both in events.txt, Google first, with a space between them:
        relay: https://script.google.com/macros/s/AKfycb.../exec https://taterpeeler-relay.yourname.workers.dev
The game tries them in that order.
