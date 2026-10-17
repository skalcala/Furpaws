# Free one-minute reminder scheduler

Production endpoint: `https://furpaws-khaki.vercel.app/api/internal/reminders`

The application creates in-app notifications for approved appointments within 24 hours and vaccinations due within 7 days. Repeated requests do not create duplicate reminders. This does not send SMS or email.

## Status

The protected endpoint and a separate `REMINDER_JOB_SECRET` Production environment variable are configured. The external job still needs to be created in your own scheduler account. Until that is done, production uses the daily Vercel job and refreshes reminders when users open notifications. Local `npm start` also runs a 60-second interval.

## Create the free job

1. Create a free account at [cron-job.org](https://cron-job.org/en/) and verify your email.
2. Choose **Create cronjob**. Title: `FurPaws reminders`. URL: `https://furpaws-khaki.vercel.app/api/internal/reminders`.
3. Set the execution schedule to **Every minute** and enable the job.
4. Under the advanced request settings, use **GET**. Add a request header named `Authorization`.
5. For the header value, enter `Bearer ` followed by the key stored privately on this Mac at `/Users/alcala/Downloads/website/.local/reminder-scheduler-secret.txt`. Keep the space after Bearer; do not include quotes or a newline. Do not put the key in the URL, GitHub, chat, or screenshots.
6. Run **Test run**. It should return HTTP **200** with `{"status":"ok"}`. Save the job and check its execution history after a few minutes.
7. If a request returns **401**, check the header spelling/key. If the key was replaced in Vercel, redeploy and update the scheduler header. For **500** or a timeout, inspect Vercel function logs and Atlas connectivity before retrying.

No pet or owner data is sent to the scheduler. It only calls the protected endpoint; the server reads Atlas and creates the appropriate in-app notifications. Enable failure notifications in the scheduler if desired.

The secret file is ignored by Git and deployment uploads. To display it privately for copying, open it in your local editor. A fresh clone will not contain this key; the project owner must configure a new Production `REMINDER_JOB_SECRET` and redeploy before connecting a new job. This key is separate from the Vercel `CRON_SECRET`.

## Verify without creating fake records

A successful request may legitimately create no messages when there are no eligible upcoming visits or vaccinations. Check the request status/history and existing eligible reminders; do not create fake clinical visits in production just to test the scheduler.

Official references: [creating cron-job.org jobs](https://docs.cron-job.org/creating-cron-jobs.html), [cron-job.org features](https://cron-job.org/en/), [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing). Vercel Hobby supports daily cron scheduling; the external minute job supplies the PDF's background cadence without an open browser.
