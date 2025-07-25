/* ------------ config ------------- */
const API_BASE = '/api';
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB   = 5;
const MAX_DIM  = 1024;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

/* ------------ DOM refs ------------ */
const v   = document.getElementById('video');
const c   = document.getElementById('canvas');
const fi  = document.getElementById('fileInput');
const gal = document.getElementById('gallery');
const snap= document.getElementById('shutter');
const sw  = document.getElementById('switch');
const retry = document.getElementById('retry');
const prev  = document.getElementById('preview');
const status = document.getElementById('status');

/* ------------ Error handling ------------ */
class APIError extends Error {
  constructor(message, status, retryAfter = null) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

/* ------------ UI helpers ------------ */
function setStatus(txt, type = 'info'){
  if(!txt){ 
    status.style.display='none'; 
    status.className = '';
    return; 
  }
  status.textContent = txt;
  status.className = `status-${type}`;
  status.style.display='block';
}

/* ------------ camera -------------- */
let stream, facing='user';

// Funzione helper per cross-browser compatibility
function setupVideoAttributes(videoElement) {
  // playsinline è necessario per iOS/Safari per evitare fullscreen
  // Ma causa warning in Firefox, quindi lo aggiungiamo solo se supportato
  if ('playsInline' in videoElement) {
    videoElement.playsInline = true;
  }
  // Fallback per browser che usano l'attributo invece della proprietà
  if (videoElement.setAttribute && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
    videoElement.setAttribute('playsinline', 'true');
  }
}

async function startCam(mode='user'){
  try{
    stream?.getTracks().forEach(t=>t.stop());
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: mode,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    });
    v.srcObject = stream; 
    facing=mode;

    // Setup cross-browser video attributes
    setupVideoAttributes(v);

    // mostra switch se device ha 2 cam
    const cams=(await navigator.mediaDevices.enumerateDevices())
               .filter(d=>d.kind==='videoinput');
    sw.style.display = cams.length>1 ? 'flex' : 'none';
  }catch(e){
    console.error('Camera error',e);
    setStatus('⚠️ Impossibile accedere alla fotocamera', 'error');
    sw.style.display='none';
  }
}
startCam();

/* ------------ helpers ------------- */
async function downscale(blob){
  const url = URL.createObjectURL(blob);
  const img = await new Promise(r=>{
    const i=new Image();
    i.onload=()=>r(i);
    i.onerror=()=>r(null);
    i.src=url;
  });
  
  URL.revokeObjectURL(url);
  
  if (!img) throw new Error('Impossibile caricare immagine');
  
  const ratio=Math.min(1,MAX_DIM/Math.max(img.width,img.height));
  c.width=Math.round(img.width*ratio); 
  c.height=Math.round(img.height*ratio);
  
  const ctx = c.getContext('2d');
  ctx.drawImage(img,0,0,c.width,c.height);
  
  return new Promise(r=>c.toBlob(r,'image/jpeg',0.85));
}

/* ------------ API calls with retry ------------- */
async function apiCall(url, options = {}, retries = RETRY_ATTEMPTS) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'X-Client-Version': '2.0',
          'X-User-Id': getUserId() // Per rate limiting
        }
      });

      // Gestione rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('X-RateLimit-Reset');
        const resetDate = retryAfter ? new Date(retryAfter) : null;
        const waitTime = resetDate ? resetDate - Date.now() : 60000;
        
        throw new APIError(
          'Troppi tentativi. Riprova tra qualche minuto.',
          429,
          waitTime
        );
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new APIError(
          error.message || `Errore ${response.status}`,
          response.status
        );
      }

      return response;
      
    } catch (error) {
      // Se è l'ultimo tentativo o errore non recuperabile, rilancia
      if (attempt === retries || 
          error.status === 429 || 
          error.status === 400 ||
          error.status === 401) {
        throw error;
      }

      // Attendi prima di riprovare
      const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      setStatus(`⏳ Tentativo ${attempt + 1}/${retries}...`, 'warning');
    }
  }
}

/* ------------ Get/Set user ID for rate limiting ------------- */
function getUserId() {
  let userId = localStorage.getItem('dermaself_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('dermaself_user_id', userId);
  }
  return userId;
}

/* ------------ Upload and inference ------------- */
async function uploadAndInfer(blob){
  /* validate */
  if(!ACCEPTED.includes(blob.type)) {
    setStatus('❌ Formato non supportato. Usa JPEG, PNG o WebP', 'error');
    return;
  }
  
  if(blob.size > MAX_MB * 1024 * 1024) {
    setStatus('❌ Immagine troppo grande (max 5MB)', 'error');
    return;
  }

  try {
    // Disabilita UI
    snap.disabled = true;
    gal.disabled = true;
    
    // Downscale
    setStatus('🔄 Ottimizzazione immagine...', 'info');
    blob = await downscale(blob);
    
    /* 1. Get upload URL */
    setStatus('🔄 Generazione URL upload...', 'info');
    
    const sasResponse = await apiCall(`${API_BASE}/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        mimeType: blob.type,
        metadata: {
          userId: getUserId(),
          source: 'web'
        }
      })
    });
    
    const { uploadUrl, blobUrl } = await sasResponse.json();

    /* 2. Upload to blob storage */
    setStatus('📤 Caricamento immagine...', 'info');
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': blob.type,
        'x-ms-blob-content-type': blob.type
      },
      body: blob
    });
    
    if (!uploadResponse.ok) {
      throw new Error('Upload fallito');
    }

    /* 3. Show preview */
    v.style.display = 'none';
    prev.src = blobUrl; 
    prev.style.display = 'block';
    sw.style.display = 'none'; 
    retry.style.display = 'flex';

    /* 4. Run inference */
    setStatus('🤖 Analisi in corso...', 'info');
    
    const inferResponse = await apiCall(`${API_BASE}/infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        imageUrl: blobUrl,
        userId: getUserId()
      })
    });
    
    const result = await inferResponse.json();
    
    // Controlla se è stato messo in coda
    if (inferResponse.status === 202) {
      setStatus('⏳ Analisi in coda. Riprova tra qualche secondo...', 'warning');
      // Potresti implementare polling qui
    } else {
      // Mostra risultati
      displayResults(result);
      setStatus('✅ Analisi completata!', 'success');
    }
    
  } catch (error) {
    console.error('Error:', error);
    
    if (error instanceof APIError) {
      if (error.status === 429) {
        const minutes = Math.ceil(error.retryAfter / 60000);
        setStatus(`⏱️ Limite raggiunto. Riprova tra ${minutes} minuti`, 'error');
      } else {
        setStatus(`❌ ${error.message}`, 'error');
      }
    } else if (error.name === 'NetworkError' || !navigator.onLine) {
      setStatus('❌ Connessione assente. Verifica la rete', 'error');
    } else {
      setStatus('❌ Si è verificato un errore. Riprova', 'error');
    }
  } finally {
    // Riabilita UI
    snap.disabled = false;
    gal.disabled = false;
  }
}

/* ------------ Display results ------------- */
function displayResults(data) {
  console.log('Inference results:', data);
  
  // Se è una risposta di fallback
  if (data.fallback) {
    setStatus('⚠️ Servizio temporaneamente limitato', 'warning');
    return;
  }
  
  // Mostra numero di predizioni trovate
  const count = data.predictions?.length || 0;
  if (count > 0) {
    setStatus(`✅ Trovate ${count} aree di interesse`, 'success');
  } else {
    setStatus('✅ Nessuna area di interesse rilevata', 'success');
  }
  
  // Qui puoi aggiungere visualizzazione delle bounding box
  // o altre informazioni sui risultati
}

/* ------------ Event handlers ------------- */
gal.addEventListener('click', () => fi.click());

fi.addEventListener('change', async e => {
  if(e.target.files[0]) {
    await uploadAndInfer(e.target.files[0]);
  }
  fi.value = ''; // reset
});

snap.addEventListener('click', async () => {
  if(!stream) return;
  
  // Feedback visivo
  v.style.filter = 'brightness(1.5)';
  setTimeout(() => v.style.filter = '', 100);
  
  c.width = v.videoWidth; 
  c.height = v.videoHeight;
  c.getContext('2d').drawImage(v, 0, 0);
  
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
  await uploadAndInfer(blob);
});

sw.addEventListener('click', () => {
  startCam(facing === 'user' ? 'environment' : 'user');
});

retry.addEventListener('click', () => {
  // Reset UI
  prev.style.display = 'none'; 
  v.style.display = 'block';
  retry.style.display = 'none'; 
  sw.style.display = 'flex';
  setStatus('');
});

/* ------------ Check API health on load ------------- */
async function checkAPIHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) {
      console.warn('API health check failed');
    }
  } catch (error) {
    console.warn('Cannot reach API', error);
    setStatus('⚠️ API non raggiungibile', 'warning');
  }
}

// Check API health on startup
checkAPIHealth();
