/**
 * HOOPS AI — Club Registration Page
 * Public page (no auth required)
 */
let registrationToken = null;

document.addEventListener('DOMContentLoaded', () => {
  // Extract token from URL: /join/club/{token}
  const parts = window.location.pathname.split('/');
  registrationToken = parts[parts.length - 1];

  if (!registrationToken) {
    showExpired('Invalid registration link.');
    return;
  }
  validateLink();
});


async function validateLink() {
  try {
    const res = await fetch(`/api/club-register/${registrationToken}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      showExpired(data.detail || 'This link is no longer valid.');
      return;
    }

    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('registerState').style.display = '';
    document.getElementById('clubNameBadge').textContent = data.data.club_name;
  } catch (err) {
    showExpired('Failed to validate registration link.');
  }
}


function showExpired(message) {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('expiredState').style.display = '';
  document.getElementById('expiredMessage').textContent = message;
}


async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  const errEl = document.getElementById('authError');
  errEl.style.display = 'none';

  const password = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;

  if (password !== confirm) {
    errEl.textContent = 'Passwords do not match';
    errEl.style.display = 'block';
    return false;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> Registering...';

  try {
    const res = await fetch(`/api/club-register/${registrationToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('regName').value,
        email: document.getElementById('regEmail').value,
        password: password,
        phone: document.getElementById('regPhone').value || null,
        role_title: document.getElementById('regRole').value || null,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      errEl.textContent = data.detail || 'Registration failed';
      errEl.style.display = 'block';
      return false;
    }

    // Save admin auth token and redirect to admin portal
    localStorage.setItem('hoops_admin_token', data.data.token);
    localStorage.setItem('hoops_admin_user', JSON.stringify(data.data.user));
    window.location.href = '/admin';
  } catch (err) {
    errEl.textContent = 'Network error. Please try again.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined">person_add</span> Register';
  }
  return false;
}
