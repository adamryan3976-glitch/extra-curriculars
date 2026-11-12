# Extra-Curricular Activities: Winchester PS

Teachers add next week's extra-curricular activities, and the secretary copies a ready-made list into the Friday newsletter Google Doc.

- **Teachers:** https://extra-curriculars.winchesterps.ca
- **Secretary:** https://extra-curriculars.winchesterps.ca/#newsletter (opens the Newsletter tab directly)

The data is stored in a Google Sheet. Anyone with the link can add, edit or delete activities.

## Files

| File | What it is |
|---|---|
| `index.html`, `style.css`, `app.js` | The web app (served by GitHub Pages) |
| `config.js` | **Paste your Apps Script URL here** |
| `CNAME` | Custom domain for GitHub Pages |
| `icons/`, `favicon.ico`, `manifest.webmanifest` | Logo, browser tab icon, and home-screen app icons (iPhone & Android) |
| `apps-script/Code.gs` | Backend code that goes into the Google Sheet (not used by GitHub Pages) |

## One-time setup

### 1. Create the Google Sheet backend
1. Create a new Google Sheet, for example "Extra-Curriculars Data". Use the Google account that should own the data.
2. Go to **Extensions → Apps Script**. Delete the sample code, paste in everything from `apps-script/Code.gs`, and click **Save**.
3. Click **Deploy → New deployment**. Click the gear icon, choose **Web app**, and set:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy** and approve the permissions. If you see "Google hasn't verified this app", choose **Advanced → Go to … (unsafe)**. This message is normal for your own scripts.
5. Copy the **Web app URL**. It ends in `/exec`.

> If your school board's Google Workspace blocks "Anyone" access, create the Sheet with a personal Gmail account instead.

### 2. Connect the website
Open `config.js` and paste the URL between the quotes:
```js
window.SCRIPT_URL = "https://script.google.com/macros/s/XXXXXXXX/exec";
```

### 3. Put it on GitHub Pages
1. Upload all files to the repo `adamryan3976-glitch/extra-curriculars`. Keep the `apps-script` folder too, for reference.
2. In the repo, go to **Settings → Pages**:
   - Source: **Deploy from a branch**, Branch: **main**, folder **/ (root)**
   - Custom domain: `extra-curriculars.winchesterps.ca`. The `CNAME` file fills this in automatically.
3. Have whoever manages the `winchesterps.ca` DNS add this record:

   | Type | Name | Value |
   |---|---|---|
   | CNAME | `extra-curriculars` | `adamryan3976-glitch.github.io` |

4. Once DNS has updated (minutes to a few hours), tick **Enforce HTTPS** in Settings → Pages.

## Using it

**Weekly reset:** the app moves to the new week by itself every **Sunday**. From Sunday through Saturday, it shows the week covered by the coming Friday's newsletter. For example, from Sunday Nov 15 to Saturday Nov 21 it shows the week of Nov 23–27. Nothing is deleted: older weeks stay in the Google Sheet, and you can view them from the Newsletter tab under **Look back**.

**Add to home screen:** on iPhone, open the site in Safari, tap Share, then **Add to Home Screen**. On Android, open it in Chrome, tap ⋮, then **Add to Home screen** or **Install app**.

**Teachers:** the week is already set to the next newsletter's week (you can also pick the two weeks after it to plan ahead), fill in the activity, choose one or more days, and click **Add activity**. The list underneath shows what's already entered, with Edit and Delete buttons.

**Secretary (Friday):** open the Newsletter tab (it opens on the right week), choose **Grouped by day** or **Table**, click **Copy for Google Doc**, and paste into the newsletter.

## Changing the backend code later
After you edit `Code.gs`, go to **Deploy → Manage deployments → ✏️ Edit**, set Version to **New version**, and click **Deploy**. Doing it this way keeps the same URL, so `config.js` doesn't need to change.
