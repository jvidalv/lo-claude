# Gmail From Person

Search emails from a specific person.

## Arguments
$ARGUMENTS - The person's name or email to search for

## Instructions

1. Use `gmail_search` with query `from:$ARGUMENTS`
2. Show the last 10 emails from this person
3. Format as a conversation thread showing:
   - Date and time
   - Subject
   - Brief snippet
   - Whether you replied or not (check if there's a sent email in the thread)

4. Format:
```
📧 Emails from [Name]

[Date] Subject
       Snippet...
       ↩️ You replied / ⏳ Awaiting your reply

[Date] Subject
       Snippet...
```
