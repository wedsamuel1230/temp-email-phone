可以，以下我直接給你一份可貼給 AI coding agent 的版本。這份規格以兩個已確認的事實為基礎：Email 端使用 Mail.tm 的 `/domains`、`/accounts`、`/token`、`/messages` API 流程，而你附的 TXT 是每行 `phone|sms_url` 的號碼池格式。 [docs.mail](https://docs.mail.tm)

## PRD

這個產品是一個桌面工具，用來同時管理臨時 Email 與臨時 Phone，並透過輪詢刷新偵測新郵件與新簡訊。Email 端可依 Mail.tm 官方流程建立帳號、取得 Bearer token、列出收件箱與讀取單封訊息；Phone 端則從你提供的 TXT 匯入 `phone|sms_url` 配對資料作為本地號碼池。 [docs.mail](https://docs.mail.tm)

```md
# Product Requirements Document
## Product Name
Temp Inbox Manager

## Goal
Build a cross-platform desktop tool that lets users:
1. Create and monitor temporary email inboxes
2. Import and manage a pool of temporary phone numbers from a TXT file
3. Auto-refresh both email and SMS channels
4. Detect and highlight newly arrived messages
5. Switch the active phone number by pressing a "Change" button
6. Persist imported phone numbers locally for reuse

## Primary Users
- Users who need disposable email + disposable phone workflows
- Users who receive verification codes from email and SMS
- Users who want quick switching between multiple phone numbers

## Core Value
One app manages both temp email and temp phone inboxes with auto-refresh, local persistence, and fast switching.

## Platform
- Desktop app
- Target: Windows + macOS
- Recommended stack: Tauri + SvelteKit + TypeScript
- Local persistence: SQLite or JSON database
- HTTP client: fetch or axios

## Functional Scope
### 1. Temp Email
- Create temp email account automatically
- Show current email address
- Save account credentials in session
- Refresh inbox manually or automatically
- Open message details
- Extract OTP code heuristically from subject/text/html
- Mark new messages visually

### 2. Temp Phone Pool
- Drag and drop TXT file into app
- Parse every line as: phone|sms_url
- Validate line format
- Save valid entries into local storage
- Show all imported numbers in a pool list
- Allow one active number at a time
- Press "Change" to switch active number
- Support change modes:
  - next
  - random
  - manual select

### 3. SMS Inbox
- Poll active phone number’s sms_url
- Compare current response with last snapshot
- If changed, create a new SMS event
- Show raw SMS body and parsed OTP candidates
- Timestamp every refresh result

### 4. Refresh Engine
- Independent refresh loops for email and SMS
- Configurable intervals: 2s / 5s / 10s / 30s
- Pause/resume refresh
- Avoid duplicate notifications by comparing IDs or hashes
- Show last refresh time
- Show refresh status: idle / polling / error

### 5. Local Persistence
- Save imported phone pool locally
- Save last active phone number
- Save refresh intervals
- Save UI preferences
- Save message cache for duplicate detection
- Never expose sensitive sms_url query keys in logs

## Non-Goals (V1)
- Buying phone numbers
- Registering accounts on third-party services
- Multi-user sync
- Cloud account system
- Browser extension

## UX Requirements
### Main Layout
- Left panel: phone pool + controls
- Top tabs: Email / Phone / Settings
- Center panel: inbox list
- Right panel: selected message details
- Top action bar:
  - create email
  - refresh now
  - pause
  - change number
  - import txt

### Drag & Drop
- Drop zone accepts .txt only
- On drop:
  - parse file
  - count valid rows
  - count invalid rows
  - save valid rows
  - show import result modal

### New Message Behavior
- New item appears at top
- Tab badge count increases
- Optional sound notification
- Selected view can auto-focus newest item

### Error Handling
- Invalid TXT line → show row number and reason
- SMS endpoint timeout → keep last good result, show warning
- Email token expired → re-auth or recreate account
- Empty inbox → show designed empty state

## Acceptance Criteria
1. User can create a temp email and fetch messages
2. User can drag in a TXT file with phone|sms_url lines
3. App stores imported phone numbers locally
4. User can press "Change" and switch to another saved phone number
5. App auto-refreshes email and SMS
6. App detects new email/SMS without duplicating old events
7. User can read message content and copy OTP
8. App works on Windows and macOS

## Suggested Architecture
- providers/
  - mailtmProvider
  - smsUrlProvider
- services/
  - refreshService
  - otpService
  - storageService
  - importService
- stores/
  - emailStore
  - phoneStore
  - settingsStore
  - eventStore
- ui/
  - EmailPanel
  - PhonePanel
  - DropZone
  - InboxList
  - MessageViewer
  - SettingsDialog

## Security Notes
- Treat sms_url as secret because it may contain query keys
- Mask keys in logs and UI
- Store locally only
- Do not upload imported TXT anywhere unless explicitly enabled
```

## 資料模型

你的 TXT 樣本目前就是 `+電話號碼|get_sms_url` 的逐行格式，所以匯入器應以「一行一筆、一個號碼對一個 SMS URL」為唯一真實來源來設計。 [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/20403663/c9e22d8f-eee6-4ecd-935f-f743de75cb55/task_4354_oripa_5_success_20260414.txt) Email 端資料則應對應 Mail.tm 的帳號、token、訊息列表與單封 message 結構，因為官方文件已公開這些欄位與流程。 [docs.mail](https://docs.mail.tm)

```json
{
  "entities": {
    "EmailAccount": {
      "id": "string",
      "address": "string",
      "password": "string",
      "token": "string",
      "createdAt": "string",
      "status": "active | expired | error"
    },
    "EmailMessage": {
      "id": "string",
      "fromName": "string",
      "fromAddress": "string",
      "subject": "string",
      "intro": "string",
      "text": "string",
      "html": ["string"],
      "seen": "boolean",
      "hasAttachments": "boolean",
      "createdAt": "string",
      "updatedAt": "string",
      "raw": "object"
    },
    "PhoneEntry": {
      "id": "string",
      "phoneNumber": "string",
      "smsUrl": "string",
      "isActive": "boolean",
      "status": "ready | disabled | error",
      "lastCheckedAt": "string | null",
      "lastMessageHash": "string | null",
      "lastMessagePreview": "string | null",
      "importBatchId": "string",
      "createdAt": "string"
    },
    "SmsMessage": {
      "id": "string",
      "phoneEntryId": "string",
      "sourceUrl": "string",
      "rawBody": "string",
      "normalizedText": "string",
      "otpCandidates": ["string"],
      "detectedAt": "string",
      "contentHash": "string"
    },
    "Settings": {
      "emailRefreshIntervalMs": "number",
      "smsRefreshIntervalMs": "number",
      "autoSelectNewest": "boolean",
      "soundEnabled": "boolean",
      "changeMode": "next | random | manual"
    }
  }
}
```

## JSON API spec

下面這份是「給 AI 直接開始寫 app」的本地 API contract。當中 Email provider 依 Mail.tm 文件定義 `/domains`、`/accounts`、`/token`、`/messages` 與單封 message 讀取流程；Phone provider 則是你這次 TXT 匯入資料所衍生出的本地管理 API。 [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/20403663/c9e22d8f-eee6-4ecd-935f-f743de75cb55/task_4354_oripa_5_success_20260414.txt)

```json
{
  "appApiSpec": {
    "version": "1.0.0",
    "baseUrl": "app://local-api",
    "providers": {
      "email": {
        "name": "mail.tm",
        "upstreamBaseUrl": "https://api.mail.tm"
      },
      "phone": {
        "name": "txt-imported-sms-url-pool"
      }
    },
    "endpoints": [
      {
        "name": "GetAvailableEmailDomains",
        "method": "GET",
        "path": "/v1/email/domains",
        "description": "Fetch available domains from Mail.tm",
        "upstream": {
          "method": "GET",
          "url": "https://api.mail.tm/domains"
        },
        "response": {
          "domains": [
            {
              "id": "string",
              "domain": "string",
              "isActive": true,
              "isPrivate": false
            }
          ]
        }
      },
      {
        "name": "CreateTempEmailAccount",
        "method": "POST",
        "path": "/v1/email/accounts",
        "request": {
          "address": "string",
          "password": "string"
        },
        "description": "Create temp email account through Mail.tm",
        "upstream": {
          "method": "POST",
          "url": "https://api.mail.tm/accounts"
        },
        "response": {
          "account": {
            "id": "string",
            "address": "string",
            "password": "string"
          }
        }
      },
      {
        "name": "CreateRandomTempEmailAccount",
        "method": "POST",
        "path": "/v1/email/accounts/random",
        "request": {
          "preferredDomain": "string | null"
        },
        "description": "Generate random local-part, create account, then return credentials",
        "response": {
          "account": {
            "id": "string",
            "address": "string",
            "password": "string"
          }
        }
      },
      {
        "name": "LoginTempEmail",
        "method": "POST",
        "path": "/v1/email/token",
        "request": {
          "address": "string",
          "password": "string"
        },
        "description": "Get bearer token from Mail.tm",
        "upstream": {
          "method": "POST",
          "url": "https://api.mail.tm/token"
        },
        "response": {
          "token": "string"
        }
      },
      {
        "name": "GetEmailMessages",
        "method": "GET",
        "path": "/v1/email/messages",
        "query": {
          "page": "number | optional"
        },
        "headers": {
          "Authorization": "Bearer <local-session-token>"
        },
        "description": "Return normalized inbox list from Mail.tm",
        "upstream": {
          "method": "GET",
          "url": "https://api.mail.tm/messages"
        },
        "response": {
          "messages": [
            {
              "id": "string",
              "fromName": "string",
              "fromAddress": "string",
              "subject": "string",
              "intro": "string",
              "seen": "boolean",
              "hasAttachments": "boolean",
              "createdAt": "string",
              "updatedAt": "string"
            }
          ],
          "total": "number"
        }
      },
      {
        "name": "GetEmailMessageById",
        "method": "GET",
        "path": "/v1/email/messages/:id",
        "headers": {
          "Authorization": "Bearer <local-session-token>"
        },
        "description": "Fetch a single email message detail from Mail.tm",
        "upstream": {
          "method": "GET",
          "url": "https://api.mail.tm/messages/{id}"
        },
        "response": {
          "message": {
            "id": "string",
            "from": {
              "name": "string",
              "address": "string"
            },
            "to": [
              {
                "name": "string",
                "address": "string"
              }
            ],
            "subject": "string",
            "text": "string",
            "html": ["string"],
            "seen": "boolean",
            "hasAttachments": "boolean",
            "attachments": [
              {
                "id": "string",
                "filename": "string",
                "contentType": "string",
                "size": "number",
                "downloadUrl": "string"
              }
            ],
            "createdAt": "string",
            "updatedAt": "string"
          },
          "otpCandidates": ["string"]
        }
      },
      {
        "name": "ImportPhonePoolTxt",
        "method": "POST",
        "path": "/v1/phone/import",
        "contentType": "multipart/form-data",
        "request": {
          "file": ".txt"
        },
        "description": "Parse TXT lines in phone|sms_url format and save valid entries locally",
        "response": {
          "importBatchId": "string",
          "totalLines": "number",
          "validCount": "number",
          "invalidCount": "number",
          "entries": [
            {
              "id": "string",
              "phoneNumber": "string",
              "smsUrlMasked": "string",
              "isActive": false
            }
          ],
          "errors": [
            {
              "lineNumber": "number",
              "lineText": "string",
              "reason": "INVALID_FORMAT | INVALID_PHONE | INVALID_URL"
            }
          ]
        }
      },
      {
        "name": "ListPhonePool",
        "method": "GET",
        "path": "/v1/phone/entries",
        "response": {
          "entries": [
            {
              "id": "string",
              "phoneNumber": "string",
              "isActive": "boolean",
              "status": "ready | disabled | error",
              "lastCheckedAt": "string | null",
              "lastMessagePreview": "string | null"
            }
          ]
        }
      },
      {
        "name": "SetActivePhoneEntry",
        "method": "POST",
        "path": "/v1/phone/active",
        "request": {
          "entryId": "string"
        },
        "response": {
          "activeEntry": {
            "id": "string",
            "phoneNumber": "string",
            "isActive": true
          }
        }
      },
      {
        "name": "ChangePhoneEntry",
        "method": "POST",
        "path": "/v1/phone/change",
        "request": {
          "mode": "next | random | manual",
          "entryId": "string | optional"
        },
        "description": "Switch active phone number",
        "response": {
          "previousEntryId": "string | null",
          "activeEntry": {
            "id": "string",
            "phoneNumber": "string",
            "isActive": true
          }
        }
      },
      {
        "name": "RefreshActivePhoneSms",
        "method": "POST",
        "path": "/v1/phone/refresh",
        "description": "Call active phone sms_url and compare with last snapshot",
        "response": {
          "activeEntryId": "string",
          "changed": "boolean",
          "message": {
            "id": "string",
            "rawBody": "string",
            "normalizedText": "string",
            "otpCandidates": ["string"],
            "contentHash": "string",
            "detectedAt": "string"
          }
        }
      },
      {
        "name": "GetPhoneMessages",
        "method": "GET",
        "path": "/v1/phone/messages",
        "query": {
          "entryId": "string | optional"
        },
        "response": {
          "messages": [
            {
              "id": "string",
              "phoneEntryId": "string",
              "normalizedText": "string",
              "otpCandidates": ["string"],
              "detectedAt": "string"
            }
          ]
        }
      },
      {
        "name": "GetSettings",
        "method": "GET",
        "path": "/v1/settings",
        "response": {
          "settings": {
            "emailRefreshIntervalMs": 5000,
            "smsRefreshIntervalMs": 5000,
            "autoSelectNewest": true,
            "soundEnabled": true,
            "changeMode": "next"
          }
        }
      },
      {
        "name": "UpdateSettings",
        "method": "PATCH",
        "path": "/v1/settings",
        "request": {
          "emailRefreshIntervalMs": "number | optional",
          "smsRefreshIntervalMs": "number | optional",
          "autoSelectNewest": "boolean | optional",
          "soundEnabled": "boolean | optional",
          "changeMode": "next | random | manual | optional"
        },
        "response": {
          "settings": {
            "emailRefreshIntervalMs": "number",
            "smsRefreshIntervalMs": "number",
            "autoSelectNewest": "boolean",
            "soundEnabled": "boolean",
            "changeMode": "string"
          }
        }
      },
      {
        "name": "GetRefreshStatus",
        "method": "GET",
        "path": "/v1/refresh/status",
        "response": {
          "email": {
            "running": "boolean",
            "lastCheckedAt": "string | null",
            "lastChangedAt": "string | null",
            "intervalMs": "number"
          },
          "phone": {
            "running": "boolean",
            "lastCheckedAt": "string | null",
            "lastChangedAt": "string | null",
            "intervalMs": "number"
          }
        }
      },
      {
        "name": "ToggleRefresh",
        "method": "POST",
        "path": "/v1/refresh/toggle",
        "request": {
          "target": "email | phone | all",
          "running": "boolean"
        },
        "response": {
          "ok": true
        }
      }
    ]
  }
}
```

## 開發規則

Mail.tm 的驗證規則很清楚：除了建立帳號與取得 domains 之外，其餘請求都需要 Bearer token，所以本地 session manager 必須先保存 token，再由 email service 自動帶入授權標頭。 而 Mail.tm 訊息清單與單封詳情都已提供 `id`、`subject`、`intro`、`text`、`html`、`hasAttachments`、`createdAt` 等欄位，因此新訊息判斷應優先以 `id` 去重，再用內容 hash 作為保險。 [docs.mail](https://docs.mail.tm)

```md
# Engineering Rules for AI Coder
1. Build the app with clean architecture and provider adapters.
2. Keep Mail.tm integration inside EmailProvider only.
3. Keep TXT-imported SMS URL logic inside PhonePoolProvider only.
4. Never log full sms_url keys; always mask query tokens.
5. Use polling, not websockets, for V1.
6. Use message ID as primary dedupe key for email.
7. Use response body hash as primary dedupe key for SMS.
8. Save phone pool and settings locally.
9. Handle invalid TXT rows gracefully.
10. Expose all app state through typed stores.
11. OTP extraction should detect 4-8 digit codes from subject/text/SMS body.
12. Refresh loops must be stoppable and restartable without memory leaks.
13. UI should support drag-and-drop and file picker import.
14. "Change" button must support next/random/manual behavior.
15. App must run offline for local state, except provider requests.
```

## 給 AI 的任務提示

如果你把這份直接貼給 AI coding agent，最好再補一段明確輸出要求，這樣它更容易一次生成正確專案。你可以要求它依照上面的 PRD 與 JSON API spec，先產出 Tauri + SvelteKit + TypeScript 專案骨架，再建立 `mailtmProvider`、`phonePoolProvider`、`refreshService`、`storageService` 與基本三欄 UI。

你可以直接附這段提示詞：

```md


如果你要，我下一步可以直接幫你補成「**完整 system prompt 版**」，即是你把整份貼進 Cursor / Windsurf / Claude Code 就可以直接開始生成專案。