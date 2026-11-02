import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini SDK with telemetry header
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Check FFmpeg status
  let hasFFmpeg = false;
  try {
    const { stdout } = await execAsync('ffmpeg -version');
    if (stdout.includes('ffmpeg version')) {
      hasFFmpeg = true;
    }
  } catch (err) {
    hasFFmpeg = false;
  }

  // 1. Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY),
      hasFFmpeg,
      nodeVersion: process.version,
    });
  });

  // 2. Generate Spec with Gemini AI
  app.post('/api/generate-spec', async (req: Request, res: Response) => {
    const { prompt, style, duration, aspectRatio } = req.body;

    if (!prompt || !style) {
      res.status(400).json({ error: 'Prompt e estilo são obrigatórios.' });
      return;
    }

    try {
      if (ai) {
        let systemPrompt = `Você é o compilador sênior da engine de animação ANIMATION STUDIO AI.
O usuário fornecerá um prompt em linguagem natural descrevendo uma animação e o estilo desejado: "${style}".
Converta o pedido em uma especificação JSON válida, profissional, visualmente impactante e determinística.
Formato: ${aspectRatio || '9:16'}. Duração: ${duration || 10} segundos.
Todo o texto deve estar em português correto e polido.`;

        let responseSchema: any;

        if (style === 'minimalistic-graphics') {
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              steps: { type: Type.INTEGER, description: 'Número de degraus entre 5 e 10' },
              lines: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Uma ou duas frases curtas, reflexivas ou impactantes',
              },
              light: { type: Type.BOOLEAN, description: 'Fundo claro (true) ou escuro (false)' },
              accent: { type: Type.STRING, description: 'Cor de destaque hexadecimal (ex: #6366f1)' },
              shape: { type: Type.STRING, description: 'sphere, cube ou diamond' },
            },
            required: ['steps', 'lines', 'light'],
          };
        } else if (style === 'graph') {
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING, description: 'Título da métrica (ex: Seguidores, Faturamento)' },
              values: {
                type: Type.ARRAY,
                items: { type: Type.NUMBER },
                description: 'Lista de 5 a 10 valores crescentes para o gráfico',
              },
              labels: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Rótulos temporais do eixo X (ex: Jan, Fev, Mar...)',
              },
              final: { type: Type.NUMBER, description: 'Valor final alvo no final da curva' },
              prefix: { type: Type.STRING, description: 'Prefixo como R$, $ ou vazio' },
              suffix: { type: Type.STRING, description: 'Sufixo como K, % ou un.' },
              decimals: { type: Type.INTEGER, description: 'Casas decimais (0 a 2)' },
              dark: { type: Type.BOOLEAN, description: 'Tema escuro true/false' },
              accent: { type: Type.STRING, description: 'Cor hexadecimal do destaque (ex: #10b981)' },
            },
            required: ['label', 'values', 'labels', 'final', 'dark'],
          };
        } else if (style === 'map-route') {
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              destination: { type: Type.STRING, description: 'Nome do local de destino' },
              distance: { type: Type.NUMBER, description: 'Distância em km (ex: 4.5)' },
              minutes: { type: Type.INTEGER, description: 'Tempo estimado em minutos' },
              unit: { type: Type.STRING, description: 'km' },
              accent: { type: Type.STRING, description: 'Cor da rota hex (ex: #3b82f6)' },
              seed: { type: Type.INTEGER, description: 'Número semente para geração do mapa' },
              places: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Pontos turísticos ou avenidas no trajeto',
              },
              transportMode: { type: Type.STRING, description: 'car, bike ou walking' },
            },
            required: ['destination', 'distance', 'minutes', 'places'],
          };
        } else if (style === 'breakdown') {
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Nome principal do dispositivo/objeto' },
              subtitle: { type: Type.STRING, description: 'Subtítulo técnico da desmontagem' },
              accent: { type: Type.STRING, description: 'Cor técnica hex (ex: #06b6d4)' },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    num: { type: Type.STRING, description: '01, 02, 03...' },
                    title: { type: Type.STRING, description: 'Nome da peça ou componente' },
                    desc: { type: Type.STRING, description: 'Especificação técnica do componente' },
                    layerIndex: { type: Type.INTEGER, description: 'Índice da camada 0 a 3' },
                  },
                  required: ['num', 'title', 'desc', 'layerIndex'],
                },
              },
            },
            required: ['title', 'subtitle', 'items'],
          };
        } else if (style === 'stick-figure') {
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Título da explicação' },
              accent: { type: Type.STRING, description: 'Cor de destaque hex' },
              shots: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING, description: 'Legenda curta da cena' },
                    characterAction: { type: Type.STRING, description: 'walk, jump, point, shrug ou wave' },
                    mood: { type: Type.STRING, description: 'curious, surprised, happy ou explaining' },
                    prop: { type: Type.STRING, description: 'ship_deck, clouds, lantern ou treasure' },
                  },
                  required: ['text', 'characterAction', 'mood'],
                },
              },
            },
            required: ['title', 'shots'],
          };
        } else {
          // zach-d-films 3D explainer
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING, description: 'Tema ou título da investigação' },
              question: { type: Type.STRING, description: 'Pergunta de impacto inicial' },
              twist: { type: Type.STRING, description: 'Revelação científica / física do impacto' },
              accent: { type: Type.STRING, description: 'Cor hex (ex: #ef4444)' },
              subject: { type: Type.STRING, description: 'armor, gadget, human_heart ou bullet_vest' },
              impactEffect: { type: Type.STRING, description: 'ripple, sparks ou slow_motion' },
            },
            required: ['topic', 'question', 'twist'],
          };
        }

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Crie a especificação para o prompt: "${prompt}" no estilo "${style}".`,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema,
          },
        });

        const generatedData = JSON.parse(response.text || '{}');
        res.json({
          success: true,
          style,
          data: generatedData,
          source: 'gemini-3.8-flash',
        });
        return;
      }
    } catch (geminiError: any) {
      console.warn('Gemini API call failed, using intelligent deterministic fallback:', geminiError?.message);
    }

    // Intelligent fallback generator
    const fallbackData = generateFallbackSpec(style, prompt);
    res.json({
      success: true,
      style,
      data: fallbackData,
      source: 'deterministic-generator',
    });
  });

  // 3. Export MP4: Initialize temporary session
  app.post('/api/export-mp4/init', async (req: Request, res: Response) => {
    try {
      const sessionId = 'anim_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const tempDir = path.join(os.tmpdir(), sessionId);
      await fs.promises.mkdir(tempDir, { recursive: true });

      res.json({
        sessionId,
        tempDir,
        fps: 30,
        hasFFmpeg,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Falha ao inicializar sessão de exportação: ' + err.message });
    }
  });

  // 4. Export MP4: Receive batch of frames
  app.post('/api/export-mp4/chunk', async (req: Request, res: Response) => {
    const { sessionId, startFrame, frames } = req.body;
    if (!sessionId || !frames || !Array.isArray(frames)) {
      res.status(400).json({ error: 'Parâmetros inválidos para envio de quadros.' });
      return;
    }

    const tempDir = path.join(os.tmpdir(), sessionId);
    if (!fs.existsSync(tempDir)) {
      res.status(404).json({ error: 'Sessão de renderização não encontrada ou expirada.' });
      return;
    }

    try {
      for (let i = 0; i < frames.length; i++) {
        const frameIndex = (startFrame || 0) + i;
        const frameDataUrl = frames[i];
        // Strip data:image/jpeg;base64,
        const base64Data = frameDataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `frame_${String(frameIndex).padStart(5, '0')}.jpg`;
        await fs.promises.writeFile(path.join(tempDir, filename), buffer);
      }

      res.json({ success: true, count: frames.length, nextIndex: (startFrame || 0) + frames.length });
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao gravar quadros no servidor: ' + err.message });
    }
  });

  // 5. Export MP4: Finish & compile MP4 with FFmpeg
  app.post('/api/export-mp4/finish', async (req: Request, res: Response) => {
    const { sessionId, totalFrames, fps = 30 } = req.body;
    if (!sessionId) {
      res.status(400).json({ error: 'SessionId obrigatório.' });
      return;
    }

    const tempDir = path.join(os.tmpdir(), sessionId);
    if (!fs.existsSync(tempDir)) {
      res.status(404).json({ error: 'Sessão de renderização não encontrada.' });
      return;
    }

    const outputMp4Path = path.join(tempDir, 'output.mp4');

    try {
      // Execute ffmpeg with libx264, 30fps, faststart
      const ffmpegCmd = `ffmpeg -y -framerate ${fps} -i "${tempDir}/frame_%05d.jpg" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -movflags +faststart "${outputMp4Path}"`;
      console.log('Running FFmpeg:', ffmpegCmd);
      await execAsync(ffmpegCmd);

      // Verify MP4 file
      if (!fs.existsSync(outputMp4Path)) {
        throw new Error('Arquivo MP4 não foi gerado pelo FFmpeg.');
      }

      const stat = await fs.promises.stat(outputMp4Path);
      if (stat.size < 1000) {
        throw new Error('Arquivo MP4 gerado está vazio ou corrompido.');
      }

      res.json({
        success: true,
        downloadUrl: `/api/export-mp4/download/${sessionId}`,
        fileSize: stat.size,
        totalFrames,
        fps,
      });
    } catch (err: any) {
      console.error('Erro na codificação FFmpeg:', err);
      res.status(500).json({ error: 'Erro ao compilar vídeo MP4: ' + err.message });
    }
  });

  // 6. Download the real MP4 video
  app.get('/api/export-mp4/download/:sessionId', (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const tempDir = path.join(os.tmpdir(), sessionId);
    const outputMp4Path = path.join(tempDir, 'output.mp4');

    if (!fs.existsSync(outputMp4Path)) {
      res.status(404).send('Vídeo não encontrado ou expirado.');
      return;
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="animation-studio-${sessionId}.mp4"`);

    const stream = fs.createReadStream(outputMp4Path);
    stream.pipe(res);

    // Schedule cleanup after 15 minutes
    setTimeout(async () => {
      try {
        if (fs.existsSync(tempDir)) {
          await fs.promises.rm(tempDir, { recursive: true, force: true });
        }
      } catch (e) {
        // ignore
      }
    }, 15 * 60 * 1000);
  });

  // Vite development mode vs production static
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ANIMATION STUDIO AI server rodando em http://0.0.0.0:${PORT}`);
  });
}

function generateFallbackSpec(style: string, prompt: string): any {
  if (style === 'minimalistic-graphics') {
    return {
      steps: 7,
      lines: [
        prompt.length > 5 ? prompt.slice(0, 50) : 'Cada passo pequeno parece insignificante',
        'Até você olhar para trás e ver o topo conquistado.',
      ],
      light: false,
      accent: '#6366f1',
      shape: 'sphere',
    };
  }

  if (style === 'graph') {
    return {
      label: prompt.length > 3 ? prompt.slice(0, 35) : 'Crescimento Acelerado',
      values: [1.2, 3.4, 7.8, 18, 38, 64, 88, 100],
      labels: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8'],
      final: 100000,
      prefix: '',
      suffix: '',
      decimals: 0,
      dark: true,
      accent: '#10b981',
    };
  }

  if (style === 'map-route') {
    return {
      destination: prompt.length > 5 ? prompt.slice(0, 40) : 'Destino Central & Parque',
      distance: 4.8,
      minutes: 16,
      unit: 'km',
      accent: '#3b82f6',
      seed: 42,
      places: ['Av. Central', 'Ponte Estaiada', 'Jardins', 'Praça Maior', 'Ponto Chegada'],
      transportMode: 'car',
    };
  }

  if (style === 'breakdown') {
    return {
      title: prompt.length > 3 ? prompt.slice(0, 30).toUpperCase() : 'HARDWARE PRO X',
      subtitle: 'ANATOMIA EXPLODIDA EM CAMADAS',
      accent: '#06b6d4',
      items: [
        { num: '01', title: 'CHASSIS TITÂNIO', desc: 'Vidro fosco texturizado com MagSafe 15W', layerIndex: 0 },
        { num: '02', title: 'CÉLULA LI-ION', desc: 'Bateria de 4.850 mAh de alta densidade', layerIndex: 1 },
        { num: '03', title: 'PLACA NEURAL BIONIC', desc: 'PCB 10 camadas com processador 3nm', layerIndex: 2 },
        { num: '04', title: 'DISPLAY OLED 120HZ', desc: 'Super Retina XDR com Ceramic Shield', layerIndex: 3 },
      ],
    };
  }

  if (style === 'stick-figure') {
    return {
      title: prompt.slice(0, 30),
      accent: '#f59e0b',
      shots: [
        { text: prompt.slice(0, 45), characterAction: 'shrug', mood: 'curious', prop: 'ship_deck' },
        { text: 'A explicação que ninguém te contou na escola!', characterAction: 'point', mood: 'explaining', prop: 'clouds' },
        { text: 'A física e a química resolvem o enigma!', characterAction: 'jump', mood: 'surprised', prop: 'lantern' },
        { text: 'Agora você já sabe o segredo!', characterAction: 'wave', mood: 'happy', prop: 'treasure' },
      ],
    };
  }

  return {
    topic: prompt.slice(0, 35),
    question: prompt.slice(0, 45) + '?',
    twist: 'A curvatura e dureza do material dispersam o choque!',
    accent: '#ef4444',
    subject: 'armor',
    impactEffect: 'ripple',
  };
}

startServer();
