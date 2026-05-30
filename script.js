const state = {
  contacts: [],
  filtered: [],
  loading: false,
  sortAscending: true,
};

const elements = {};

function cacheElements() {
  elements.exportBtn = document.getElementById('exportBtn');
  elements.csvBtn = document.getElementById('csvBtn');
  elements.themeToggle = document.getElementById('themeToggle');
  elements.supportMessage = document.getElementById('supportMessage');
  elements.countMessage = document.getElementById('countMessage');
  elements.messageBar = document.getElementById('messageBar');
  elements.loader = document.getElementById('loader');
  elements.contactsBody = document.getElementById('contactsBody');
  elements.searchInput = document.getElementById('searchInput');
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.body.dataset.theme = theme;
  localStorage.setItem('contact-exporter-theme', theme);
}

function initTheme() {
  const savedTheme = localStorage.getItem('contact-exporter-theme');
  const preferredTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  setTheme(preferredTheme);
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  setTheme(nextTheme);
}

function isContactPickerSupported() {
  return Boolean(navigator.contacts && typeof navigator.contacts.select === 'function');
}

function showMessage(text, type = 'info') {
  elements.messageBar.textContent = text;
  elements.messageBar.className = `message-bar ${type}`;
}

function setSupportWarning() {
  if (isContactPickerSupported()) {
    elements.supportMessage.textContent = 'Contact Picker API is available on this browser.';
    elements.supportMessage.className = 'status-message success';
    return;
  }

  elements.supportMessage.textContent = 'Warning: Safari and many iPhone browsers do not support the Contact Picker API. Use Android Chrome for best results.';
  elements.supportMessage.className = 'status-message warn';
}

function setLoading(isLoading) {
  state.loading = isLoading;
  elements.loader.classList.toggle('hidden', !isLoading);
  elements.exportBtn.disabled = isLoading;
  elements.csvBtn.disabled = isLoading || state.contacts.length === 0;
  elements.exportBtn.textContent = isLoading ? 'Fetching Contacts...' : 'Export Contacts';
}

function updateCounter(count = state.filtered.length) {
  elements.countMessage.textContent = `${count} Contacts Found`;
}

function normalizeContact(contact) {
  const names = Array.isArray(contact.name) ? contact.name : contact.name ? [contact.name] : ['Unknown Contact'];
  const phones = Array.isArray(contact.tel) ? contact.tel : contact.tel ? [contact.tel] : [];
  return {
    name: names.find(Boolean)?.trim() || 'Unknown Contact',
    phones: phones.map((value) => String(value).trim()).filter(Boolean),
  };
}

function dedupeAndFlattenContacts(contacts) {
  const seen = new Set();
  const flattened = [];

  contacts.forEach((contact) => {
    const normalized = normalizeContact(contact);
    const uniquePhones = normalized.phones.filter((phone) => {
      const key = phone.replace(/\s+/g, '');
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    uniquePhones.forEach((phone) => {
      flattened.push({
        name: normalized.name,
        phone,
      });
    });
  });

  return flattened;
}

function sortContacts(contacts, ascending = true) {
  return [...contacts].sort((left, right) => {
    const comparison = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
    return ascending ? comparison : -comparison;
  });
}

function renderContacts() {
  const rows = state.filtered;

  if (rows.length === 0) {
    elements.contactsBody.innerHTML = '<tr class="empty-row"><td colspan="3">No matching contacts found.</td></tr>';
    updateCounter(0);
    return;
  }

  elements.contactsBody.innerHTML = rows
    .map((contact, index) => `
      <tr>
        <td>
          <span class="contact-name">${escapeHtml(contact.name)}</span>
          <span class="contact-meta">Row ${index + 1}</span>
        </td>
        <td>${escapeHtml(contact.phone)}</td>
        <td>
          <div class="action-group">
            <button class="copy-button" type="button" data-copy="${escapeAttribute(`${contact.name}\t${contact.phone}`)}">Copy Contact</button>
          </div>
        </td>
      </tr>
    `)
    .join('');

  updateCounter(rows.length);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function applySearch(query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    state.filtered = [...state.contacts];
  } else {
    state.filtered = state.contacts.filter((contact) => contact.name.toLowerCase().includes(normalizedQuery));
  }
  renderContacts();
}

function exportToSheet() {
  const workbookData = state.contacts.map((contact) => ({
    'Contact Name': contact.name,
    'Phone Number': contact.phone,
  }));

  const worksheet = XLSX.utils.json_to_sheet(workbookData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');
  XLSX.writeFile(workbook, 'contacts.xlsx');
}

function exportToCsv() {
  const header = ['Contact Name', 'Phone Number'];
  const lines = [header.join(',')];

  state.contacts.forEach((contact) => {
    lines.push([contact.name, contact.phone].map(csvCell).join(','));
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, 'contacts.csv');
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value) {
  const stringValue = String(value ?? '');
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function triggerDownload(url, filename) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

async function copyContact(text) {
  try {
    await navigator.clipboard.writeText(text);
    showMessage('Contact copied to clipboard.', 'success');
  } catch (error) {
    showMessage('Copy failed. Your browser may block clipboard access.', 'error');
  }
}

async function fetchContacts() {
  if (!isContactPickerSupported()) {
    showMessage('This browser does not support the Contact Picker API. Try Android Chrome for full functionality.', 'error');
    return;
  }

  setLoading(true);
  showMessage('Requesting contact permission...', 'info');

  try {
    const selectedContacts = await navigator.contacts.select(['name', 'tel'], { multiple: true });
    const flattened = dedupeAndFlattenContacts(selectedContacts || []);
    state.contacts = sortContacts(flattened, state.sortAscending);
    state.filtered = [...state.contacts];

    if (state.contacts.length === 0) {
      showMessage('No contacts were returned from the picker.', 'warn');
    } else {
      showMessage(`Loaded ${state.contacts.length} contacts. You can search, copy, or download them now.`, 'success');
    }

    renderContacts();
    elements.csvBtn.disabled = state.contacts.length === 0;
  } catch (error) {
    const message = String(error?.name || error?.message || '');
    if (message.includes('NotAllowedError') || message.includes('AbortError')) {
      showMessage('Permission denied or contact picker dismissed. No contacts were imported.', 'error');
    } else {
      showMessage('Unable to access contacts in this browser. Please try Android Chrome.', 'error');
    }
  } finally {
    setLoading(false);
  }
}

function bindEvents() {
  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.exportBtn.addEventListener('click', fetchContacts);
  elements.csvBtn.addEventListener('click', exportToCsv);

  elements.searchInput.addEventListener('input', (event) => {
    applySearch(event.target.value);
  });

  elements.contactsBody.addEventListener('click', async (event) => {
    const copyButton = event.target.closest('[data-copy]');
    if (!copyButton) {
      return;
    }
    await copyContact(copyButton.dataset.copy);
  });

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      elements.searchInput.focus();
    }
  });
}

function initialize() {
  cacheElements();
  initTheme();
  setSupportWarning();
  bindEvents();
  updateCounter(0);
  showMessage('Tap Export Contacts to request permission and load your contacts.', 'info');
}

document.addEventListener('DOMContentLoaded', initialize);
