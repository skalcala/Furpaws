# Website folder repair

The requested project folder is `/Users/alcala/Downloads/website` (macOS also displays its name as `WEBSITE`). Run commands from that directory, which now directly contains the root package, `client/` and `server/`.

Missing client/server source, assets, workspace package files and tests were restored from the complete `furpaws-fixed/WEBSITE` copy, including the latest dashboard design. Existing files and a Git patch were backed up under the ignored `.local/folder-repair-*` directory. The nested `Furpaws/` checkout remains in place and is excluded from Git/deployment uploads.

Dependencies were reinstalled with `npm ci`. Server environment configuration remains private in `server/.env`. The repaired frontend and API returned HTTP 200, and `/api/health` reported the database connected when launched with `npm start` from this folder. The production build passed.

To run after stopping any existing instance:

```sh
cd /Users/alcala/Downloads/website
npm start
```

The normal start command opens the default browser. No seeding or production clinical-data reset was performed as part of this repair.
