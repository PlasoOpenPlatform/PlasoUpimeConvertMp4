const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path')
const net = require('net');

// 等待x毫秒
function sleep(millionSecond) {
    return new Promise(r => setTimeout(r, millionSecond));
}

// 获取当前时间
function getDateTime() {
    var date = new Date();
    var logtime = ("0" + (date.getMonth() + 1)).slice(-2) + "-" + ("0" + date.getDate()).slice(-2);
    return logtime + "_" + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "." + date.getMilliseconds() + " "
}

// 日志函数
async function log(msg) {
    if (!msg) return
    if (typeof msg === 'string') {
        return msg
    }

    if (!msg.args) {
        return msg._text
    }

    const args = await Promise.all(msg.args().map(arg => arg.executionContext().evaluate(arg => {
        if (arg instanceof Error)
            return arg.message;
        return arg;
    }, arg)));
    console.log(getDateTime(), ...args);
}

// 日志函数
function onError(error) {
    console.error(getDateTime(), "onError >>>>>>>>>>>>>>>>>>>>>>>>>>>>> " + error);
}

// 日志函数
function logInfo(msg) {
    console.info(getDateTime(), msg);
}

// 开始收流，并写入文件
function startRecvSvr(fileName) {
    return new Promise(r => {
        server = net.createServer();
        server.on('connection', function (socket) {
            var file = fs.createWriteStream(fileName);
            socket.on('data', function (data) {
                file.write(data);
            });
        });

        server.listen(9001, r)
    })
}


async function main() {
    // 视频文件路径
    var outputFileName = `./output/test.webm`
    await startRecvSvr(outputFileName)

    // dom组件id，用来检测是否就绪，以及控制播放
    var playButtonId = '#PlayButtonBig'
    var containerId = '#upimeSection'

    // 窗口大小
    var defaultViewport = {
        width: 1280,
        height: 720
    }
    // 录制插件
    const extensionPath = path.join(__dirname, "extension");
    const extensionId = "jjndjgheafjngoipoacpjgeicjeomjli";

    // 启动浏览器
    var browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        // executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        headless: false,
        ignoreHTTPSErrors: true,
        // ignoreDefaultArgs: ['--mute-audio', '--disable-extensions'],
        args: [
            `--window-size=1280,960`,
            '--no-sandbox',
            '--disable-infobars',
            '--disable-dev-shm-usage',
            `--load-extension=${extensionPath}`,
            `--disable-extensions-except=${extensionPath}`,
            `--allowlisted-extension-id=${extensionId}`,
            '--autoplay-policy=no-user-gesture-required',
            '--remote-debugging-port=9222',
            '--remote-debugging-address=0.0.0.0',
        ],
        defaultViewport,
    })

    const targets = browser.targets();
    const extensionTarget = targets.find(
        (target) => target.type() === "background_page" && target._targetInfo.title === "Video Capture"
    );
    browser.videoCaptureExtension = await extensionTarget.page();
    browser.videoCaptureExtension.on('console', log)
    browser.videoCaptureExtension.on('pageerror', onError)
    browser.videoCaptureExtension.on('error', onError)

    const page = await browser.newPage();
    page.on('pageerror', onError)
    page.on('error', onError)
    page.on('close', () => {
        logInfo("on close >>>>>>>>>>>>>>>>>>>>>>>>>>>>> page closed");
    })

    let endDetected = false;

    // 开始录制，通过回调控制
    await page.exposeFunction("upimePlayStart", async () => {
        logInfo(">>>>>>>>>>>>>>>>>>>> play start callbask");
        await browser.videoCaptureExtension.evaluate(
            async (opt) => {
                return await START_RECORDING(opt);
            }, defaultViewport
        );
        logInfo(`videoCaptureExtension started in callback; status: ${started}`)
        if (!started) {
            throw new Error("start videoCaptureExtension failed");
        }
    });

    // 停止录制，通过回调控制
    await page.exposeFunction("upimePlayEnd", async () => {
        logInfo("<<<<<<<<<<<<<<<<<< play end callback, endDetected=" + endDetected)
        if (!endDetected) {
            endDetected = true;
            await browser.videoCaptureExtension.evaluate(
                () => { STOP_RECORDING() }
            );
            logInfo(`<<<<<<<<<<<<<<<<<< videoCaptureExtension stoped by callback`)
            await sleep(5000);
            await browser.close();
            process.exit(0);
        }
    });

    // 打开播放历史课堂页面，需要替换成可用链接
    await page.goto("https://wwwr.plaso.cn/static/sdk/styleupime/1.33.213/?appId=infi&appType=player&recordId=64abb520a7ffbc00091f828e&validBegin=1691408054&validTime=3600&signature=A2AF84D4E8BC12AD626764EC4C0379024A2BBA74");

    // 设置页面大小
    await page.waitForSelector(containerId);
    let boundingBox = JSON.parse(await page.evaluate((containerId) => {
        return `{"width": ${$(containerId).outerWidth()}, "height": ${$(containerId).outerHeight()}}`
    }, containerId))
    defaultViewport = { width: boundingBox.width, height: boundingBox.height }
    await page.setViewport(defaultViewport)
    await page.evaluate(() => { window.dispatchEvent(new Event('resize')); })

    // 等待页面就绪
    do {
        await sleep(1000)
        boundingBox = boundingBox = JSON.parse(await page.evaluate((containerId) => {
            return `{"width": ${$(containerId).outerWidth()}, "height": ${$(containerId).outerHeight()}}`
        }, containerId))
        console.log(`check size viewport:${defaultViewport.width}x${defaultViewport.height} upime:${boundingBox.width}x${boundingBox.height}`)
        if (defaultViewport.width == boundingBox.width) break;
        page.evaluate(() => { window.dispatchEvent(new Event('resize')); })
    } while (true)

    await page.waitForSelector(playButtonId);
    page.evaluate((playButtonId) => { $('#playerToolBar').hide(); $(playButtonId).hide() }, playButtonId);
    await sleep(5000)

    // 模拟点击播放按钮
    page.evaluate((playButtonId) => { $(playButtonId).click() }, playButtonId);
}

main()