# Google Sheets Webhook Setup

This guide sets up a Google Apps Script webhook that receives form submissions and logs them to a Google Sheet.

## 1. Create the Google Sheet

Create a new Google Sheet with these column headers in Row 1:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Timestamp | Name | Phone | Email | Message | Source | GCLID | FCLID | Landing Page |

## 2. Create the Apps Script

1. In your Google Sheet, go to **Extensions > Apps Script**
2. Replace the default code with:

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.name || "",
    data.phone || "",
    data.email || "",
    data.message || "",
    data.source || "",
    data.gclid || "",
    data.fclid || "",
    data.landing_page || "",
  ]);

  return ContentService.createTextOutput(
    JSON.stringify({ status: "success" })
  ).setMimeType(ContentService.MimeType.JSON);
}
```

3. Save the project (Ctrl+S)

## 3. Deploy as Web App

1. Click **Deploy > New deployment**
2. Select type: **Web app**
3. Set:
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**
5. Authorize the app when prompted
6. Copy the **Web app URL**

## 4. Configure Environment Variable

Add the URL to your `.env` file:

```
FORM_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

## 5. Test

Submit a form on the website and verify the data appears in your Google Sheet.
