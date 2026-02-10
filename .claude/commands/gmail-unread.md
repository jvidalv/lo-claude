# Gmail Unread Summary

Show unread emails with priority classification.

## Instructions

1. Use `gmail_list` with `labelIds: ["UNREAD"]` and `maxResults: 20`
2. For each email, classify with emoji based on:
   - 🔴 **Urgent** - Requires immediate action, from important contacts, time-sensitive
   - 🟠 **Action needed** - Needs a reply or follow-up, but not urgent
   - 🟢 **FYI** - Informational, newsletters, notifications
   - ⚪ **Low priority** - Marketing, spam-like, can ignore

3. Format output as:
```
📭 Unread Emails (COUNT total)

🔴 URGENT
   [S] Sender Name                    time ago
      Subject line

🟠 ACTION NEEDED
   [S] Sender Name                    time ago
      Subject line

🟢 FYI
   [S] Sender Name                    time ago
      Subject line

⚪ LOW PRIORITY
   [S] Sender Name                    time ago
      Subject line
```

4. At the end, suggest which to handle first.
