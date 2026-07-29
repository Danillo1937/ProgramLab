import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

app.post('/api/contact', express.json(), async (req, res) => {
  const accessKey = process.env['WEB3FORMS_ACCESS_KEY'];

  if (!accessKey) {
    return res.status(500).json({ success: false, error: 'Chave de acesso ao Web3Forms não configurada.' });
  }

  const { name, email, website, service, message } = req.body as {
    name?: string;
    email?: string;
    website?: string;
    service?: string;
    message?: string;
  };

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'Nome, e-mail e mensagem são obrigatórios.' });
  }

  const formattedMessage = `Nome: ${name}\nE-mail: ${email}\nSite: ${website || 'Não informado'}\nServiço: ${service || 'Não informado'}\n\nMensagem:\n${message}`;

  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_key: accessKey,
        subject: 'Nova mensagem do formulário de contato ProgramLab',
        name,
        email,
        message: formattedMessage,
        website,
        service,
        botcheck: '',
      }),
    });

    const result = await response.json();

    if (!response.ok || result.success !== true) {
      const errorMessage = result.error || 'Falha ao enviar a mensagem para o Web3Forms.';
      return res.status(502).json({ success: false, error: errorMessage });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno ao processar a solicitação.';
    return res.status(500).json({ success: false, error: message });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
