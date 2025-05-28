const MODEL_CONFIG = {
  modelType: 'onsets_frames',
  checkpointURL: 'https://storage.googleapis.com/magentadata/js/checkpoints/transcription/onsets_frames_uni',
  quantizationSteps: 4
};

const elements = {
  audioInput: document.getElementById('audioInput'),
  processBtn: document.getElementById('processBtn'),
  btnText: document.getElementById('btnText'),
  spinner: document.getElementById('processingSpinner'),
  waveform: document.getElementById('waveform'),
  audioPreview: document.getElementById('audioPreview'),
  downloadBtn: document.getElementById('downloadBtn'),
  resultSection: document.getElementById('resultSection'),
  errorAlert: document.getElementById('errorAlert')
};

let transcriptionModel;
let wavesurfer;

async function initializeApp() {
  try {
    updateUIState('initializing');
    
    await initializeTensorFlow();
    
    transcriptionModel = await loadTranscriptionModel();
    
    wavesurfer = WaveSurfer.create({
      container: elements.waveform,
      waveColor: '#4a6bff',
      progressColor: '#2c4bff',
      cursorColor: '#1a2f99',
      height: 100,
      barWidth: 2,
      barRadius: 3,
      cursorWidth: 1
    });
    
    updateUIState('ready');
    
  } catch (error) {
    showError('Erro na inicialização: ' + error.message);
    console.error('Initialization error:', error);
  }
}

async function initializeTensorFlow() {
  // try {
  //   updateStatus('Configurando TensorFlow...');
  //   await tf.setBackend('webgl');
  // } catch (webglError) {
  //   console.warn('WebGL não disponível, usando CPU:', webglError);
    await tf.setBackend('cpu');
    updateStatus('Usando CPU (performance reduzida)');
  // }
}

async function loadTranscriptionModel() {
  updateStatus('Carregando modelo...');
  
  const model = new mm.OnsetsAndFrames(MODEL_CONFIG.checkpointURL);
  
  try {
    await model.initialize();
    return model;
  } catch (modelError) {
    console.error('Model loading failed:', modelError);
    throw new Error('Falha ao carregar o modelo de transcrição');
  }
}

async function processAudioFile(audioFile) {
  try {
    updateUIState('processing');
    
    wavesurfer.load(URL.createObjectURL(audioFile));
    
    updateStatus('Analisando áudio...');
    const transcription = await transcriptionModel.transcribeFromAudioFile(audioFile);
    
    updateStatus('Gerando arquivo MIDI...');
    const midiBlob = await generateMidiFile(transcription);
    
    prepareDownload(midiBlob, audioFile.name);
    
    elements.audioPreview.src = URL.createObjectURL(audioFile);
    elements.resultSection.style.display = 'block';
    updateUIState('completed');
    
  } catch (error) {
    showError('Erro no processamento: ' + error.message);
    console.error('Processing error:', error);
    updateUIState('ready');
  }
}

async function generateMidiFile(transcription) {
  try {
    const midiBytes = mm.sequenceProtoToMidi(transcription);
    return new Blob([midiBytes], { type: 'audio/midi' });
  } catch (error) {
    console.error('MIDI generation error:', error);
    throw new Error('Falha ao gerar arquivo MIDI');
  }
}

function prepareDownload(midiBlob, originalFilename) {
  const filename = originalFilename.replace(/\.[^/.]+$/, '') + '.mid';
  elements.downloadBtn.href = URL.createObjectURL(midiBlob);
  elements.downloadBtn.download = filename;
  elements.downloadBtn.style.display = 'block';
}

function updateUIState(state) {
  switch (state) {
    case 'initializing':
      elements.processBtn.disabled = true;
      elements.btnText.textContent = 'Inicializando...';
      elements.spinner.style.display = 'inline-block';
      break;
      
    case 'ready':
      elements.processBtn.disabled = false;
      elements.btnText.textContent = 'Converter para MIDI';
      elements.spinner.style.display = 'none';
      break;
      
    case 'processing':
      elements.processBtn.disabled = true;
      elements.btnText.textContent = 'Processando...';
      elements.spinner.style.display = 'inline-block';
      break;
      
    case 'completed':
      elements.processBtn.disabled = false;
      elements.btnText.textContent = 'Converter Novamente';
      elements.spinner.style.display = 'none';
      break;
  }
}

function updateStatus(message) {
  elements.btnText.textContent = message;
}

function showError(message) {
  elements.errorAlert.textContent = message;
  elements.errorAlert.classList.remove('d-none');
  setTimeout(() => {
    elements.errorAlert.classList.add('d-none');
  }, 5000);
}

elements.audioInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    elements.resultSection.style.display = 'none';
    elements.errorAlert.classList.add('d-none');
  }
});

elements.processBtn.addEventListener('click', async () => {
  if (elements.audioInput.files.length > 0) {
    await processAudioFile(elements.audioInput.files[0]);
  } else {
    showError('Por favor, selecione um arquivo de áudio primeiro');
  }
});

document.addEventListener('DOMContentLoaded', initializeApp);
