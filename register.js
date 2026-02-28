requireGuest();

const AVATARS = ['🃏','♠️','♥️','♦️','♣️','🎴','🦁','🐆','🦅','🌟','🔥','💎','👑','🎯','⚡','🏆'];
let selectedAvatar = '🃏';

window.addEventListener('DOMContentLoaded', function() {
  const grid = document.getElementById('avatarGrid');
  AVATARS.forEach(a => {
    const btn = document.createElement('button');
    btn.className = 'av-btn' + (a===selectedAvatar?' selected':'');
    btn.textContent = a;
    btn.onclick = () => {
      selectedAvatar = a;
      document.querySelectorAll('.av-btn').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
    };
    grid.appendChild(btn);
  });

  document.getElementById('regBtn').addEventListener('click', doRegister);
  document.addEventListener('keydown', e => {
    if(e.key==='Enter' && !document.getElementById('regBtn').disabled) doRegister();
  });
});

function showErr(msg) {
  const b = document.getElementById('errBox');
  b.textContent = msg;
  b.classList.add('show');
}

async function doRegister() {
  const u = document.getElementById('username').value.trim();
  const e = document.getElementById('email').value.trim();
  const p = document.getElementById('password').value;
  const c = document.getElementById('confirm').value;
  document.getElementById('errBox').classList.remove('show');
  if(!u||!e||!p||!c) { showErr('Remplis tous les champs.'); return; }
  if(p!==c) { showErr('Les mots de passe ne correspondent pas.'); return; }
  const btn = document.getElementById('regBtn');
  btn.disabled = true;
  document.getElementById('btnTxt').textContent = 'Création…';
  document.getElementById('spin').style.display = 'block';
  const r = await POKO_DB.register(u, p, e, selectedAvatar);
  if(r.ok) {
    window.location.href = 'index.html';
  } else {
    showErr(r.msg);
    btn.disabled = false;
    document.getElementById('btnTxt').textContent = 'Créer mon compte';
    document.getElementById('spin').style.display = 'none';
  }
}
