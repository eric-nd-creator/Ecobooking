# Deploy on Render

The root `render.yaml` describes one Node web service that serves both the built React app and the API, plus a PostgreSQL database. The service runs the base schema and numbered SQL migrations automatically on startup.

## Create the services

1. Sign in to the [Render Dashboard](https://dashboard.render.com/).
2. Choose **New** → **Blueprint** and connect the `eric-nd-creator/Ecobooking` GitHub repository.
3. Select the `main` branch and approve the Blueprint after reviewing its services. Render creates `ecobooking` and `ecobooking-db`.
4. Wait for the `ecobooking` service to finish deploying, then open its `onrender.com` URL.

The Blueprint generates a private `JWT_SECRET` and supplies the database connection settings. Add optional provider credentials such as Africa's Talking, email SMTP, or Twelve Data in the web service's **Environment** page if you want those integrations enabled.

## Free plan notes

The Blueprint uses Render's free plans for a first online preview. Free web services can spin down when idle, and free Render Postgres databases expire after 30 days. Upgrade the database before relying on it for ongoing or real booking data. See [Render's free instance limits](https://render.com/docs/free).

## Fresh database credentials

The base SQL seeds an administrator account (`ericnd8@gmail.com`). Its initial password is `123456e`; change it after the first login. The initial database setup and migrations run automatically when the service starts.

## Future updates

Push changes to `main`; Render will rebuild and redeploy the service from GitHub.
