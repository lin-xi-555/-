import express from 'express';
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.argv[2] || 3030;

// 浏览器实例管理
let browser = null;
let browserStartTime = null;
const BROWSER_MAX_LIFETIME = 15 * 60 * 1000;
let requestCount = 0;
const BROWSER_RESET_THRESHOLD = 10;

// 创建浏览器实例的函数
const createBrowser = async () => {

  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--lang=zh-CN',
      '--font-render-hinting=none',
      '--no-zygote',
      '--single-process',
      '--disable-crash-reporter',
      '--disable-breakpad',
      '--disable-extensions',
      '--disable-component-extensions-with-background-pages',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-ipc-flooding-protection',
      '--disable-renderer-backgrounding',
      '--disable-crash-reporter',
      '--disable-crashpad',
    ],
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
    timeout: 300000,
    env: {
      ...process.env,
      DISABLE_CRASH_REPORTER: 'true',
      DISABLE_CRASHPAD: 'true',
    },
  });

  browserStartTime = Date.now();


  return browser;
};

// 检查浏览器
const checkBrowserHealth = async () => {
  if (!browser || !browser.isConnected()) {
    return await createBrowser();
  }

  if (browserStartTime && (Date.now() - browserStartTime > BROWSER_MAX_LIFETIME)) {
    return await createBrowser();
  }

  try {
    const pages = await browser.pages();
    if (pages.length > 5) {
      return await createBrowser();
    }
  } catch (error) {
    return await createBrowser();
  }

  return browser;
};

app.use((req, res, next) => {
  requestCount++;
  if (requestCount >= BROWSER_RESET_THRESHOLD) {
    createBrowser().catch(console.error);
    requestCount = 0;
  }
  next();
});

app.get('/convert', async (req, res) => {
  const url = req.query.url;
  let page = null;

  if (!url || !isValidUrl(url)) {
    return res.status(400).send('Valid URL is required');
  }

  try {
    browser = await checkBrowserHealth();

    page = await browser.newPage();

    await page.setDefaultNavigationTimeout(300000);
    await page.setRequestInterception(true);

    await page.on('request', request => {
      if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
        request.continue();
      } else {
        request.continue();
      }
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 300000,
    });

    const pdfOptions = {
      format: "A4",
      printBackground: true,
      margin: {
        top: "0.5in",
        bottom: "0.5in",
        left: "0.5in",
        right: "0.5in",
      },
      preferCSSPageSize: true,
    };

    const content = await page.pdf(pdfOptions);
    const base64PDF = await Buffer.from(content).toString('base64');

    res.send({ pdf: base64PDF });
  } catch (error) {
    console.error('PDF生成错误:', error);
    res.status(500).send('Error generating PDF: ' + error.message);
  } finally {
    if (page) {
      try {
        page.removeAllListeners();
        await page.close();
      } catch (pageError) {
        console.error('关闭页面时出错:', pageError);
      }
    }
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}