# Gmail Daily Summary

Show yesterday's emails with priority classification.

## Instructions

1. Use `gmail_search` with query `after:YYYY/MM/DD before:YYYY/MM/DD` (yesterday's date range)
2. For each email, classify with emoji based on:
   - 🔴 **Urgent** - Requires immediate action, from important contacts, time-sensitive
   - 🟠 **Action needed** - Needs a reply or follow-up, but not urgent
   - 🟢 **FYI** - Informational, newsletters, notifications
   - ⚪ **Low priority** - Marketing, spam-like, can ignore

3. Format output as:
```
📬 Yesterday's Emails (DATE)

🔴 URGENT
   [S] Sender Name
      Subject line
      Brief reason why urgent

🟠 ACTION NEEDED
   [S] Sender Name
      Subject line

🟢 FYI
   [S] Sender Name
      Subject line

⚪ LOW PRIORITY
   [S] Sender Name
      Subject line
```

4. At the end, provide a summary:
```
Summary: X emails (Y urgent, Z need action)
```
