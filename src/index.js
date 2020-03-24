
const Puppeteer = require("puppeteer")
let bookHome="https://www.biqudd.com/12_12934/";
let baiduVoice="https://developer.baidu.com/vcast";
let xunFeiVoice = "http://peiyin.xunfei.cn/make/";

let bookname = process.argv[2];
if(bookname){
    console.log("请指定书名");
    process.exit(2);
}


let domain = bookHome.replace("https://","").replace("http://","").split(/[/]/g)[0];
let scheme = bookHome.split("://")[0] ;

async function addCollectionButton(page, opt={background : "red", color : "white"}) {
    await page.evaluate((opt) => {
        if (document.getElementById('_pp_id') != null) {
            return;
        }
        let button = document.createElement('button');
        button.setAttribute('id', '_pp_id');
        button.addEventListener('click', () => {
            window.ft2Click();
        });
        button.style.position = 'fixed';
        button.style.left = '30px';
        button.style.top = '100px';
        button.style.zIndex = '100000000';
        button.style.borderRadius = '50%';
        button.style.border = 'none';
        button.style.height = '80px';
        button.style.width = '80px';
        button.style.cursor = 'pointer';
        button.style.lineHeight = '80px';
        button.style.color = opt.color;
        button.style.background = opt.background;
        button.style.outline = 'none';
        button.style.fontWeight = "bold";
        button.style.fontSize = "21px";
        button.innerText = '采集';
        document.body.appendChild(button);
        window.background = opt.background;
        window.color = opt.color;
    }, opt);

}

async function disableButton(page, disable, opt={background : "red", color : "white", text : "抓取"}) {
    if (disable) {
        await page.evaluate(() => {
            let button = document.getElementById('_pp_id');
            button.innerText = '抓取中';
            button.style.color = '#999';
            button.style.background = '#D5D5D5';
            button.disabled = true;
        });

    } else {
        await page.evaluate((opt) => {
            let button = document.getElementById('_pp_id');
            button.innerText = opt.text;
            button.style.color = opt.color;
            button.style.background = opt.background;
            button.disabled = false;
        }, opt);
    }
}


async function addEvent(page, url) {
    await page.on('domcontentloaded', async () => {
        await init(page, url);
    });
    page.on('error', () => {
        page.close();
    });
    page.on('close', () => {
    });
}

async function init(page, addr) {
    console.log('请求:', addr);
    const client = await page.target().createCDPSession();
    await client.send('Page.enable');
    await client.send('Network.enable');
    let addButton = await page.evaluate(()=>{
        let content = document.getElementById("content");
        if(content){
            return 1;
        }
        return 0;
    });
    if(addButton == 1) {
        await addCollectionButton(page);
        let findFt2Click = await page.evaluate(() => {
            return window['ft2Click'];
        });
        if (!findFt2Click) {
            findFt2Click = async function() {
                await startCollection(page);
            };
            await page.exposeFunction('ft2Click', findFt2Click).catch(() => {});
        }
        
    }


}


async function nextPlay(){
    await bookPage.bringToFront();
    let nextpage = await bookPage.evaluate(()=>{
        let href = $(".bookname a:eq(3)").attr("href");
        return href;
    });
    if(nextpage && nextpage.length != 0){
        if(nextpage[0]=='/'){
            nextpage = scheme + "://" + domain + nextpage;
        }
        console.log(nextpage);
        await bookPage.goto( nextpage);
        await bookPage.waitFor("#content");
        await startCollection(bookPage);
    }
}

let pageBd ,pageXf , bookPage;
async function startCollection(page){
    await disableButton(page,true);
    
    let content = await page.$eval("#content",el=>el && el.textContent);
    let title = await page.$eval(".bookname h1",el=>el && el.textContent);
    if(content && content.length>10 && title && title.length > 1){
        if(content.length > 5000){
            content = content.replace(/\s+/g,"");
        }
        if(pageBd){

            await pageBd.bringToFront();
            await pageBd.evaluate((title,content)=>{
                $(".title-input").val(title);
                $(".content-input").val(content);
                $(".emotion-voice-div .voice-radio-click").click();
                $(".generate-voice-button").click();
                window["_play_url"]=false;
                findMp3=function(){
                    let mp3=$(".mp3_url_input").val();
                    if(mp3 && mp3.length > 5){
                        window["_play_url"] = mp3;
                        $(".shiting_button").click();
                        return;
                    }
                    setTimeout(findMp3,3000);
                }
                setTimeout(findMp3,3000);
            },title,content);
        }
        if(pageXf){
            await pageXf.bringToFront();
            await pageXf.evaluate((title,content)=>{
                window["__content"] = title + "\r\n" + content;
                window["playSound"] = function(c){
                    $("#mtext1").val(c);
                    $("#mtext1").focus();
                    $(".jp-play.py_make_play:eq(0)").click();
                }
                window["__delay"] = 1500;
                window["__sizenum"] = {};
                checkNext = function(){
                    if($(".py_make_play:eq(0)").hasClass("cur")){
                        console.log("当前文章播放中...");
                        let count = window["__sizenum"] [$(".sizenum2").text()];
                        if(!count){
                            window["__sizenum"] [$(".sizenum2").text()] = 1;
                        }
                        window["__sizenum"] [$(".sizenum2").text()] = window["__sizenum"] [$(".sizenum2").text()]+1;
                        if(window["__sizenum"] [$(".sizenum2").text()] > 5){//连续多次进度条都没有变化，重新播放这段话
                            console.log("进度条长时间没有变化，重新播放");
                            playSound(window["__current_content"]);
                        }
                        setTimeout(checkNext,window["__delay"]);
                    }else{
                        if(window["__content"].length>0){
                            let i = 200;
                            let content =  window["__content"].substring(0,i);
                            for(;i<window["__content"].length;i++){
                                let char = window["__content"][i];
                                content += char;
                                if(char == '。' || char == '”'  || char == '\n'){//截取最近一段
                                    break;
                                }
                            }
                            window["__content"] = window["__content"].substring(i+1);
                            window["__current_content"] = content;
                            playSound(content);
                            setTimeout(checkNext,window["__delay"]);
                        }else{
                            console.log("当前文章播放结束，准备开始下一章...");
                            setTimeout(()=>{
                                nextPlay();
                            },window["__delay"]);
                        }
                    }
                }
                setTimeout(checkNext,3000);
            },title,content);
         
        }

        
    }
    
    await disableButton(page,false);
    
}


// ffmpeg -ss 00:00:10 -i "http://play.zhuafan.live/live/live_1568883087092.flv?auth_key=1580884644-63796935-0-c214c76406498199c757195fbe80bbba&uid=live_1568883087092" -f mjpeg -r 1 -vframes 1 -an sample.jpg

(async () => {

    const browser = await Puppeteer.launch({
        headless:false,
        defaultViewport:{
            width:1024,
            height:900
        }
    });

    browser.on('targetcreated', async (target) => {
        let page = await target.page();
        let url = await target.url();
        await addEvent(page, url).catch((e) => {
            if(e.message.indexOf('on\' of null')==-1){
                console.error(e)
            }
        });
    });
    browser.on('targetchanged', async (target) => {
        let page = await target.page();
        let url = await target.url();
        await addEvent(page, url).catch((e) => {
            if(e.message.indexOf('on\' of null')==-1){
                console.error(e)
            }
        });
    });

    const pages = await browser.pages();

    if(pages.length>0){
        bookPage = pages[0];
    }else{
        bookPage = await browser.newPage();
    }
    await bookPage.goto(bookHome);
    
    // if(!pageBd){
    //     pageBd = await page.browser().newPage();
    //     await pageBd.goto(baiduVoice);
    // }
    if(!pageXf){
        pageXf = await bookPage.browser().newPage();
        await pageXf.goto(xunFeiVoice);
        await pageXf.exposeFunction('nextPlay', nextPlay).catch(() => {});
    }
    await bookPage.bringToFront();

    // await browser.close();
  })();
