# DejaOS Host WebAPI

The prototype backend uses only built-in Node.js 20+ modules and has no npm dependencies.

```powershell
cd C:\Work\dejaos\dejaos_host\webapi
npm start
```

After startup, open `http://localhost:8080/` to use the management UI from the sibling `web/` directory.

Main APIs:

- `GET /api/health`: service status
- `GET /api/time`: time used by the device status bar
- `GET /api/apps`: management app list
- `POST /api/apps`: create an app
- `GET /api/apps/:id`: app details
- `PUT /api/apps/:id`: save an app draft
- `POST /api/apps/:id/publish`: publish an app
- `GET /api/device/apps`: apps available to devices
- `GET /api/device/apps/:id/download`: download a published app package

App data is stored in `data/apps.json`. For prototype validation, packages currently use the `.dxapp.json` format; this can be replaced with a production archive format later.
