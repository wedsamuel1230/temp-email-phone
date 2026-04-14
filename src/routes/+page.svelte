<script lang="ts">
  import type {
    AppSettings,
    ChangeMode,
    EmailMessageDetail,
    EmailMessageSummary,
    PhonePoolEntry,
    SmsMessage,
    TempEmailAccount
  } from '$api/contracts';
  import { createAccount, createToken, getAvailableDomains, getMessageById, getMessages } from '$services/mailtmService';
  import { localStorageService } from '$services/localStorageService';
  import { refreshService } from '$services/refreshService';
  import { buildSmsMessage, fetchSmsSnapshot } from '$services/smsService';
  import { maskSensitiveUrl } from '$utils/mask';
  import { pickPhoneByMode, removePhoneEntry } from '$utils/phoneChange';
  import { parsePhonePoolTxt, type PhonePoolParseError } from '$utils/phonePoolParser';

  type TabKey = 'email' | 'phone' | 'settings';

  const refreshIntervals = [2000, 5000, 10000, 30000];

  let activeTab: TabKey = 'email';
  let settings: AppSettings = localStorageService.getSettings();

  let phoneEntries: PhonePoolEntry[] = localStorageService.getPhonePool();
  let activePhoneId: string | null = localStorageService.getActivePhoneId();

  let smsMessages: SmsMessage[] = localStorageService.getSmsMessages();
  let selectedSmsId: string | null = smsMessages[0]?.id ?? null;

  let emailSession: TempEmailAccount | null = localStorageService.getEmailSession();
  let emailMessages: EmailMessageSummary[] = [];
  let selectedEmailId: string | null = null;
  let selectedEmailDetail: EmailMessageDetail | null = null;

  let fileInputEl: HTMLInputElement | null = null;

  let isPollingEmail = false;
  let isPollingPhone = false;
  let isCreatingEmail = false;
  let isRefreshingEmail = false;
  let isRefreshingSms = false;

  let importSummary = '';
  let importErrors: PhonePoolParseError[] = [];

  let emailError = '';
  let smsError = '';
  let generalError = '';

  let emailLastCheckedAt: string | null = null;
  let emailLastChangedAt: string | null = null;
  let smsLastCheckedAt: string | null = null;
  let smsLastChangedAt: string | null = null;
  let copyStatus = '';
  let isDragOver = false;

  const getActivePhoneEntry = (): PhonePoolEntry | null => phoneEntries.find((entry) => entry.id === activePhoneId) ?? null;

  const persistPhoneEntries = () => {
    localStorageService.savePhonePool(phoneEntries);
  };

  const persistSmsMessages = () => {
    localStorageService.saveSmsMessages(smsMessages);
  };

  const persistSettings = () => {
    localStorageService.saveSettings(settings);
  };

  const activatePhone = (entryId: string | null) => {
    activePhoneId = entryId;
    localStorageService.setActivePhoneId(entryId);
    phoneEntries = phoneEntries.map((entry) => ({ ...entry, isActive: entry.id === entryId }));
    persistPhoneEntries();
  };

  const randomString = (length: number): string => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  };

  const createTempEmail = async () => {
    isCreatingEmail = true;
    emailError = '';
    try {
      const domains = await getAvailableDomains();
      const activeDomain = domains.find((domain) => domain.isActive) ?? domains[0];
      if (!activeDomain) {
        throw new Error('No Mail.tm domain available right now.');
      }

      const address = `${randomString(12)}@${activeDomain.domain}`;
      const password = `${randomString(12)}A9!`;
      const account = await createAccount(address, password);
      const token = await createToken(address, password);

      emailSession = {
        ...account,
        token
      };
      localStorageService.setEmailSession(emailSession);

      await refreshEmail();
    } catch (error) {
      emailError = error instanceof Error ? error.message : 'Failed to create temp email account.';
    } finally {
      isCreatingEmail = false;
    }
  };

  const refreshEmail = async () => {
    if (!emailSession?.token) {
      return;
    }

    isRefreshingEmail = true;
    emailError = '';

    try {
      const next = await getMessages(emailSession.token);
      const previousIds = new Set(emailMessages.map((message) => message.id));
      const hasNew = next.some((message) => !previousIds.has(message.id));

      emailMessages = next;
      emailLastCheckedAt = new Date().toISOString();
      if (hasNew) {
        emailLastChangedAt = emailLastCheckedAt;
      }

      if (!selectedEmailId && emailMessages.length) {
        selectedEmailId = emailMessages[0].id;
        await selectEmail(emailMessages[0].id);
      }
    } catch (error) {
      emailError = error instanceof Error ? error.message : 'Failed to refresh email.';
    } finally {
      isRefreshingEmail = false;
    }
  };

  const selectEmail = async (id: string) => {
    selectedEmailId = id;
    if (!emailSession?.token) {
      return;
    }

    try {
      selectedEmailDetail = await getMessageById(emailSession.token, id);
    } catch (error) {
      emailError = error instanceof Error ? error.message : 'Failed to load email detail.';
    }
  };

  const refreshSms = async () => {
    const activeEntry = getActivePhoneEntry();
    if (!activeEntry) {
      return;
    }

    isRefreshingSms = true;
    smsError = '';

    try {
      const snapshot = await fetchSmsSnapshot(activeEntry.smsUrl);
      smsLastCheckedAt = new Date().toISOString();

      if (activeEntry.lastCheckedAt && snapshot.contentHash === activeEntry.lastCheckedAt) {
        return;
      }

      const message = buildSmsMessage(activeEntry.id, snapshot.rawBody, snapshot.contentHash);

      smsMessages = [message, ...smsMessages.filter((item) => item.contentHash !== snapshot.contentHash)].slice(0, 300);
      selectedSmsId = message.id;
      smsLastChangedAt = new Date().toISOString();

      phoneEntries = phoneEntries.map((entry) =>
        entry.id === activeEntry.id
          ? {
              ...entry,
              lastCheckedAt: snapshot.contentHash
            }
          : entry
      );

      persistPhoneEntries();
      persistSmsMessages();
    } catch (error) {
      smsError = error instanceof Error ? error.message : 'Failed to refresh SMS.';
    } finally {
      isRefreshingSms = false;
    }
  };

  const applyPollingSettings = () => {
    if (isPollingEmail && emailSession?.token) {
      refreshService.start('email', settings.emailRefreshIntervalMs, refreshEmail);
    }
    if (isPollingPhone && getActivePhoneEntry()) {
      refreshService.start('phone', settings.smsRefreshIntervalMs, refreshSms);
    }
  };

  const togglePollingAll = async () => {
    const shouldStart = !isPollingEmail || !isPollingPhone;

    if (shouldStart) {
      isPollingEmail = Boolean(emailSession?.token);
      isPollingPhone = Boolean(getActivePhoneEntry());
      if (isPollingEmail) {
        refreshService.start('email', settings.emailRefreshIntervalMs, refreshEmail);
      }
      if (isPollingPhone) {
        refreshService.start('phone', settings.smsRefreshIntervalMs, refreshSms);
      }
      await Promise.all([refreshEmail(), refreshSms()]);
      return;
    }

    isPollingEmail = false;
    isPollingPhone = false;
    refreshService.stopAll();
  };

  const handleFileText = (content: string) => {
    const parsed = parsePhonePoolTxt(content);

    const dedupeMap = new Map(phoneEntries.map((entry) => [entry.phoneNumber, entry]));
    parsed.entries.forEach((entry) => {
      if (!dedupeMap.has(entry.phoneNumber)) {
        dedupeMap.set(entry.phoneNumber, entry);
      }
    });

    phoneEntries = [...dedupeMap.values()];

    if (!activePhoneId && phoneEntries.length) {
      activatePhone(phoneEntries[0].id);
    } else {
      persistPhoneEntries();
    }

    importSummary = `Imported ${parsed.validCount}/${parsed.totalLines} rows. Invalid: ${parsed.invalidCount}.`;
    importErrors = parsed.errors;
  };

  const importTxtFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.txt')) {
      generalError = 'Only .txt files are accepted.';
      return;
    }

    generalError = '';
    const text = await file.text();
    handleFileText(text);
  };

  const handleChangePhone = () => {
    const next = pickPhoneByMode(phoneEntries, settings.changeMode, activePhoneId, activePhoneId ?? undefined);
    if (!next) {
      smsError = 'No available phone entry for selected change mode.';
      return;
    }

    activatePhone(next.id);
    void refreshSms();
  };

  const handleRemovePhone = (entryId: string) => {
    const result = removePhoneEntry(phoneEntries, entryId, activePhoneId);
    phoneEntries = result.entries;
    persistPhoneEntries();
    activatePhone(result.nextActiveId);

    if (result.nextActiveId === null) {
      smsMessages = [];
      selectedSmsId = null;
      persistSmsMessages();
      smsError = '';
    }
  };

  const manuallySetPhone = (event: Event) => {
    const selected = (event.target as HTMLSelectElement).value;
    if (!selected) {
      return;
    }
    activatePhone(selected);
    void refreshSms();
  };

  const onDrop = async (event: DragEvent) => {
    event.preventDefault();
    isDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }
    await importTxtFile(file);
  };

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    isDragOver = true;
  };

  const onDragLeave = () => {
    isDragOver = false;
  };

  const onFileInputChange = async (event: Event) => {
    const file = (event.target as HTMLInputElement)?.files?.[0];
    if (!file) {
      return;
    }
    await importTxtFile(file);
  };

  let selectedSms: SmsMessage | null = null;
  let selectedSmsOtp: string | null = null;
  let selectedEmailOtp: string | null = null;

  $: selectedSms = smsMessages.find((message) => message.id === selectedSmsId) ?? null;
  $: selectedSmsOtp = selectedSms?.otpCandidates[0] ?? null;
  $: selectedEmailOtp = selectedEmailDetail?.otpCandidates[0] ?? null;

  const formatTime = (iso: string | null): string => (iso ? new Date(iso).toLocaleString() : 'N/A');

  const updateInterval = (target: 'email' | 'sms', value: string) => {
    const interval = Number(value);
    if (!Number.isFinite(interval)) {
      return;
    }

    if (target === 'email') {
      settings = { ...settings, emailRefreshIntervalMs: interval };
    } else {
      settings = { ...settings, smsRefreshIntervalMs: interval };
    }

    persistSettings();
    applyPollingSettings();
  };

  const updateChangeMode = (value: string) => {
    settings = { ...settings, changeMode: value as ChangeMode };
    persistSettings();
  };

  const onChangeModeSelect = (event: Event) => {
    updateChangeMode((event.target as HTMLSelectElement).value);
  };

  const onEmailIntervalSelect = (event: Event) => {
    updateInterval('email', (event.target as HTMLSelectElement).value);
  };

  const onSmsIntervalSelect = (event: Event) => {
    updateInterval('sms', (event.target as HTMLSelectElement).value);
  };

  const copyCode = async (value: string | null, label: string) => {
    if (!value) {
      copyStatus = `No ${label} code available.`;
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      copyStatus = `${label} code copied: ${value}`;
    } catch {
      copyStatus = `Clipboard blocked. ${label} code: ${value}`;
    }
  };

  const copyValue = async (value: string | null, label: string) => {
    if (!value) {
      copyStatus = `No ${label} value available.`;
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      copyStatus = `${label} copied.`;
    } catch {
      copyStatus = `Clipboard blocked. ${label}: ${value}`;
    }
  };

  if (emailSession?.token) {
    void refreshEmail();
  }
</script>

<main class="app-shell">
  <header class="action-bar">
    <div>
      <p class="kicker">Temp Inbox Manager</p>
      <h1>Email + Phone OTP Workbench</h1>
    </div>
    <div class="actions">
      <button on:click={createTempEmail} disabled={isCreatingEmail}>{isCreatingEmail ? 'Creating...' : 'Create Email'}</button>
      <button on:click={refreshEmail} disabled={isRefreshingEmail || !emailSession}>Refresh Email</button>
      <button on:click={refreshSms} disabled={isRefreshingSms || !activePhoneId}>Refresh SMS</button>
      <button on:click={togglePollingAll}>{isPollingEmail || isPollingPhone ? 'Pause Polling' : 'Start Polling'}</button>
      <button on:click={handleChangePhone} disabled={!phoneEntries.length}>Change Number</button>
      <button on:click={() => fileInputEl?.click()}>Import TXT</button>
      <input bind:this={fileInputEl} type="file" accept=".txt" hidden on:change={onFileInputChange} />
    </div>
  </header>

  {#if generalError}
    <p class="error-banner">{generalError}</p>
  {/if}

  <section class="tabs">
    <button class:active={activeTab === 'email'} on:click={() => (activeTab = 'email')}>Email</button>
    <button class:active={activeTab === 'phone'} on:click={() => (activeTab = 'phone')}>Phone</button>
    <button class:active={activeTab === 'settings'} on:click={() => (activeTab = 'settings')}>Settings</button>
  </section>

  <section class="workspace" aria-label="Main workspace" on:drop={onDrop} on:dragover={onDragOver} on:dragleave={onDragLeave}>
    <aside class="panel phone-panel">
      <h2>Phone Pool</h2>
      <button class:drag-over={isDragOver} class="dropzone" on:click={() => fileInputEl?.click()}>
        Drop TXT here or click to import
      </button>
      <p class="small">Format: phone|sms_url</p>
      {#if importSummary}
        <p class="summary">{importSummary}</p>
      {/if}
      {#if importErrors.length}
        <details>
          <summary>Invalid rows ({importErrors.length})</summary>
          <ul>
            {#each importErrors as err}
              <li>Line {err.lineNumber}: {err.reason}</li>
            {/each}
          </ul>
        </details>
      {/if}

      <label>
        Change Mode
        <select value={settings.changeMode} on:change={onChangeModeSelect}>
          <option value="next">Next</option>
          <option value="random">Random</option>
          <option value="manual">Manual</option>
        </select>
      </label>

      {#if settings.changeMode === 'manual'}
        <label>
          Select Active
          <select value={activePhoneId ?? ''} on:change={manuallySetPhone}>
            <option value="">Choose number</option>
            {#each phoneEntries as entry}
              <option value={entry.id}>{entry.phoneNumber}</option>
            {/each}
          </select>
        </label>
      {/if}

      <ul class="pool-list">
        {#if !phoneEntries.length}
          <li class="empty">No phone entries. Import TXT to begin.</li>
        {:else}
          {#each phoneEntries as entry}
            <li class:active={entry.id === activePhoneId}>
              <div class="inline-actions">
                <button on:click={() => activatePhone(entry.id)}>{entry.phoneNumber}</button>
                <button class="copy-btn" on:click={() => copyValue(entry.phoneNumber, 'Phone number')}>Copy</button>
                <button class="remove-btn" on:click={() => handleRemovePhone(entry.id)}>Remove</button>
              </div>
              <small>{maskSensitiveUrl(entry.smsUrl)}</small>
            </li>
          {/each}
        {/if}
      </ul>

      {#if smsError}
        <p class="error-inline">{smsError}</p>
      {/if}
      <p class="small">SMS checked: {formatTime(smsLastCheckedAt)}</p>
      <p class="small">SMS changed: {formatTime(smsLastChangedAt)}</p>
    </aside>

    <section class="panel inbox-panel">
      {#if activeTab === 'email'}
        <h2>Email Inbox</h2>
        {#if emailSession}
          <div class="inline-actions">
            <p class="small">Address: {emailSession.address}</p>
            <button class="copy-btn" on:click={() => copyValue(emailSession?.address ?? null, 'Email account')}>Copy Email</button>
            <button class="copy-btn" on:click={() => copyValue(emailSession?.password ?? null, 'Email password')}>Copy Password</button>
          </div>
        {:else}
          <p class="empty">Create a temp email account to start.</p>
        {/if}

        {#if emailError}
          <p class="error-inline">{emailError}</p>
        {/if}

        <ul class="message-list">
          {#if !emailMessages.length}
            <li class="empty">No email messages yet.</li>
          {:else}
            {#each emailMessages as message}
              <li class:selected={message.id === selectedEmailId}>
                <button on:click={() => selectEmail(message.id)}>
                  <strong>{message.subject || '(No subject)'}</strong>
                  <span>{message.fromAddress}</span>
                </button>
              </li>
            {/each}
          {/if}
        </ul>

        <p class="small">Email checked: {formatTime(emailLastCheckedAt)}</p>
        <p class="small">Email changed: {formatTime(emailLastChangedAt)}</p>
      {/if}

      {#if activeTab === 'phone'}
        <h2>SMS Events</h2>
        <ul class="message-list">
          {#if !smsMessages.length}
            <li class="empty">No SMS events yet.</li>
          {:else}
            {#each smsMessages as sms}
              <li class:selected={sms.id === selectedSmsId}>
                <button on:click={() => (selectedSmsId = sms.id)}>
                  <strong>{sms.otpCandidates.length ? `OTP: ${sms.otpCandidates.join(', ')}` : 'No OTP detected'}</strong>
                  <span>{new Date(sms.detectedAt).toLocaleString()}</span>
                </button>
              </li>
            {/each}
          {/if}
        </ul>
      {/if}

      {#if activeTab === 'settings'}
        <h2>Polling Settings</h2>
        <label>
          Email refresh
          <select value={settings.emailRefreshIntervalMs} on:change={onEmailIntervalSelect}>
            {#each refreshIntervals as interval}
              <option value={interval}>{interval / 1000}s</option>
            {/each}
          </select>
        </label>

        <label>
          SMS refresh
          <select value={settings.smsRefreshIntervalMs} on:change={onSmsIntervalSelect}>
            {#each refreshIntervals as interval}
              <option value={interval}>{interval / 1000}s</option>
            {/each}
          </select>
        </label>
      {/if}
    </section>

    <aside class="panel detail-panel">
      <h2>Details</h2>
      {#if activeTab === 'email'}
        {#if selectedEmailDetail}
          <p><strong>From:</strong> {selectedEmailDetail.fromAddress}</p>
          <p><strong>Subject:</strong> {selectedEmailDetail.subject || '(No subject)'}</p>
          <p>
            <strong>OTP:</strong> {selectedEmailDetail.otpCandidates.length ? selectedEmailDetail.otpCandidates.join(', ') : 'None'}
            <button on:click={() => copyCode(selectedEmailOtp, 'Email')} disabled={!selectedEmailOtp}>Copy</button>
          </p>
          <pre>{selectedEmailDetail.text || selectedEmailDetail.intro || 'No text content.'}</pre>
        {:else}
          <p class="empty">Select an email to inspect details.</p>
        {/if}
      {/if}

      {#if activeTab === 'phone'}
        {#if selectedSms}
          <p>
            <strong>OTP:</strong> {selectedSms.otpCandidates.length ? selectedSms.otpCandidates.join(', ') : 'None'}
            <button on:click={() => copyCode(selectedSmsOtp, 'SMS')} disabled={!selectedSmsOtp}>Copy</button>
          </p>
          <pre>{selectedSms.rawBody}</pre>
        {:else}
          <p class="empty">Select an SMS event to inspect details.</p>
        {/if}
      {/if}

      {#if activeTab === 'settings'}
        <p class="small">Current mode: {settings.changeMode}</p>
        <p class="small">Polling email: {isPollingEmail ? 'On' : 'Off'}</p>
        <p class="small">Polling SMS: {isPollingPhone ? 'On' : 'Off'}</p>
      {/if}
    </aside>
  </section>

  {#if copyStatus}
    <p class="summary">{copyStatus}</p>
  {/if}
</main>

<style>
  .app-shell {
    max-width: 1300px;
    margin: 0 auto;
    padding: 1rem 1.3rem 1.6rem;
    display: grid;
    gap: 1rem;
  }

  .action-bar {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .kicker {
    margin: 0;
    color: var(--brand);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
  }

  h1 {
    margin: 0.2rem 0 0;
    font-size: clamp(1.4rem, 2.8vw, 2rem);
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  button,
  select {
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    padding: 0.5rem 0.75rem;
    cursor: pointer;
  }

  button:hover {
    border-color: var(--brand);
  }

  .tabs {
    display: flex;
    gap: 0.45rem;
  }

  .tabs button.active {
    background: color-mix(in oklch, var(--brand-soft) 62%, white 38%);
    border-color: color-mix(in oklch, var(--brand) 70%, white 30%);
  }

  .workspace {
    display: grid;
    grid-template-columns: 290px 1fr 360px;
    gap: 0.9rem;
  }

  .panel {
    border: 1px solid var(--line);
    border-radius: 16px;
    background: var(--surface);
    padding: 0.95rem;
    min-height: 520px;
    display: grid;
    align-content: flex-start;
    gap: 0.7rem;
  }

  .panel h2 {
    margin: 0;
    font-size: 1rem;
  }

  label {
    display: grid;
    gap: 0.35rem;
    font-size: 0.84rem;
    color: var(--muted);
  }

  .pool-list,
  .message-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.45rem;
    max-height: 420px;
    overflow: auto;
  }

  .pool-list li,
  .message-list li {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 0.4rem;
    display: grid;
    gap: 0.35rem;
  }

  .pool-list li.active,
  .message-list li.selected {
    border-color: color-mix(in oklch, var(--brand) 65%, white 35%);
    background: color-mix(in oklch, var(--brand-soft) 35%, white 65%);
  }

  .pool-list button,
  .message-list button {
    border: none;
    padding: 0;
    text-align: left;
    background: transparent;
  }

  .small {
    margin: 0;
    color: var(--muted);
    font-size: 0.8rem;
  }

  .summary {
    margin: 0;
    color: var(--ok);
    font-weight: 600;
    font-size: 0.85rem;
  }

  .dropzone {
    width: 100%;
    min-height: 68px;
    border: 2px dashed color-mix(in oklch, var(--brand) 55%, white 45%);
    border-radius: 12px;
    background: color-mix(in oklch, var(--brand-soft) 22%, white 78%);
    color: var(--text);
    font-weight: 600;
  }

  .dropzone.drag-over {
    border-color: var(--brand);
    background: color-mix(in oklch, var(--brand-soft) 55%, white 45%);
  }

  .inline-actions {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
  }

  .copy-btn {
    padding: 0.26rem 0.54rem;
    font-size: 0.76rem;
    line-height: 1.1;
  }

  .remove-btn {
    padding: 0.26rem 0.54rem;
    font-size: 0.76rem;
    line-height: 1.1;
    border-color: #dba6a6;
    color: #7d2d2d;
  }

  .error-inline,
  .error-banner {
    margin: 0;
    color: #b32e2e;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .error-banner {
    border: 1px solid #e6bcbc;
    background: #fff2f2;
    border-radius: 10px;
    padding: 0.6rem 0.75rem;
  }

  pre {
    margin: 0;
    white-space: pre-wrap;
    font-family: 'JetBrains Mono', 'Cascadia Code', monospace;
    font-size: 0.82rem;
    line-height: 1.45;
    background: #f7f4f1;
    border-radius: 10px;
    border: 1px solid var(--line);
    padding: 0.7rem;
    max-height: 500px;
    overflow: auto;
  }

  .empty {
    margin: 0;
    color: var(--muted);
    font-size: 0.86rem;
  }

  details ul {
    margin: 0.3rem 0 0;
    padding-left: 1rem;
  }

  @media (max-width: 1120px) {
    .workspace {
      grid-template-columns: 1fr;
    }

    .panel {
      min-height: 300px;
    }
  }
</style>
