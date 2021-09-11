require('dotenv').config()
const { decryptMedia, Client } = require('@open-wa/wa-automate')
const axios = require('axios')
const moment = require('moment-timezone')
moment.tz.setDefault('Asia/Kolkata').locale('in')
const { meme } = require('../../lib')
const { msgFilter, color, processTime, is } = require('../../utils')
const { uploadImages } = require('../../utils/fetcher')
const { removeBackgroundFromImageBase64 } = require('remove.bg')
const fs = require('fs-extra', 'fs')
const papa = require("papaparse");
const request = require("request");
const { menuId } = require('./text')
const { def, stickerreply } = require('./text/replies')

module.exports = msgHandler = async (client, message) => {
    try {
        const { type, id, from, t, sender, isGroupMsg, chat, caption, isMedia, mimetype, quotedMsg, mentionedJidList } = message
        let { body } = message
        const { name, formattedTitle } = chat
        let { pushname, verifiedName, formattedName } = sender
        pushname = pushname || verifiedName || formattedName // verifiedName is the name of someone who uses a business account
        const botNumber = await client.getHostNumber() + '@c.us'
        const ownerNumber = ["91XXXXXXXXXX@c.us"]
        const isOwner = ownerNumber.includes(sender.id)
        const groupId = isGroupMsg ? chat.groupMetadata.id : ''
        const groupAdmins = isGroupMsg ? await client.getGroupAdmins(groupId) : ''
        const groupMembers = isGroupMsg ? await client.getGroupMembersId(groupId) : ''
        const isGroupAdmins = groupAdmins.includes(sender.id) || false
        const isBotGroupAdmins = groupAdmins.includes(botNumber) || false

        // Bot Prefix
        const prefix = '#'
        body = (type === 'chat' && body.startsWith(prefix)) ? body : (((type === 'image' || type === 'video') && caption) && caption.startsWith(prefix)) ? caption : ''
        const command = body.slice(1).trim().split(/ +/).shift().toLowerCase()
        const arg = body.substring(body.indexOf(' ') + 1)
        const args = body.trim().split(/ +/).slice(1)
        const isCmd = body.startsWith(prefix)
        const isQuotedImage = quotedMsg && quotedMsg.type === 'image'
        const uaOverride = process.env.UserAgent

        // [BETA] Avoid Spam Message
        if (isCmd && msgFilter.isFiltered(from) && !isGroupMsg) { return console.log(color('[SPAM]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname)) }
        if (isCmd && msgFilter.isFiltered(from) && isGroupMsg) { return console.log(color('[SPAM]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname), 'in', color(name || formattedTitle)) }
        if (!isCmd && !isGroupMsg) { return console.log('[RECV]', color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), 'Message from', color(pushname)) }
        if (!isCmd && isGroupMsg) { return console.log('[RECV]', color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), 'Message from', color(pushname), 'in', color(name || formattedTitle)) }
        if (isCmd && !isGroupMsg) { console.log(color('[EXEC]'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname)) }
        if (isCmd && isGroupMsg) { console.log(color('[EXEC]'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname), 'in', color(name || formattedTitle)) }
        // [BETA] Avoid Spam Message
        msgFilter.addFilter(from)

        switch (command) {
            // Menu and TnC

            case 'bt':
                if (!isOwner) return client.reply(from, 'Beta Baap Mat Ban!', id)
                let msg = body.slice(3)
                const chatz = await client.getAllChatIds()
                for (let ids of chatz) {
                    var cvk = await client.getChatById(ids)
                    if (!cvk.isReadOnly) await client.sendText(ids, `${msg}`)
                }
                client.reply(from, 'Broadcast Success!', id)
                break

            case 'botop':
                client.reply(from, 'isi baat pe coffee pila de: https://buymeacoffee.com/rishabh053', id)
                break


            case 'say':
                const ttsGB = require('node-gtts')('hi', args[0])
                const dataText = body.slice(4)
                if (dataText === '') return client.reply(from, 'Kyaa bolna hai bhai?', id)
                else if (dataText.length > 50) return client.reply(from, 'bhai itna nahi bolne wala main😒', id)
                else if (dataText.includes("bot")) return client.reply(from, 'mere baare me kucch mat bol bhai😒😒', id)
                else if (dataText.includes("jarvis")) return client.reply(from, 'nahi bol raha main jo karna hai kar le😒😒', id)
                else if (dataText.includes("Jarvis")) return client.reply(from, 'nahi bolungaaa kucch😒😒', id)
                else if (dataText.includes("Bot")) return client.reply(from, 'nikal to saale yaha see😒😒', id)
                else if (dataText.includes("Rishabh")) return client.reply(from, 'baap ko mat bol bsdk😒😒', id)
                else if (dataText.includes("rishabh")) return client.reply(from, 'bhai hai wo meraa😒', id)
                try {
                    ttsGB.save('././img/tts.mp3', dataText, function () {
                        client.sendPtt(from, '././img/tts.mp3', id)
                    })
                } catch (err) {
                    client.reply(from, err, id)
                }
                break


            case 'temperature':
            case 'temp':
                try {
                    client.reply(from, `Okay! let me get my thermometer..`, id)
                    let wapiKey = 'be0641c0a1ca915f2adb1fbeccd850fb';
                    let city = arg;
                    let wurl = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${wapiKey}`

                    request(wurl, function (err, response, body) {
                        if (err) {
                            console.log('error:', error);
                        } else {
                            let weather = JSON.parse(body)
                            if (weather.cod !== 200) return client.reply(from, 'ye konsi city hai yaar??😕', id)
                            let message = `It's ${weather.main.temp}°C in ${weather.name}`;
                            client.reply(from, `${message}`, id)
                        }
                    });
                } catch (err) {
                    console.log(err)
                }
                break

            case 'meme':
                try {
                    const subreddits1 = ['dankinindia', 'IndianMeyMeys', 'indiameme', 'IndianDankMemes']
                    const randSub1 = subreddits1[Math.random() * subreddits1.length | 0]
                    const response1 = await axios.get('https://meme-api.herokuapp.com/gimme/' + randSub1);
                    const { url } = response1.data
                    await client.sendFileFromUrl(from, `${url}`, 'meme.jpg')
                } catch (err) {
                    console.log(err)
                }
                break

            case 'speed':
            case 'ping':
                await client.reply(from, `Pong!!!!\nSpeed: ${processTime(t, moment())} _Second_`, id)
                break

            case 'tnc':
                await client.sendText(from, menuId.textTnC())
                break

            case 'menu':
            case 'help':
                await client.sendText(from, menuId.textMenu(pushname))
                    .then(() => ((isGroupMsg) && (isGroupAdmins)) ? client.sendText(from, 'Menu Admin Group: *#menuadmin*') : null)
                break

            case 'menuadmin':
            case 'admin':
                if (!isGroupMsg) return client.reply(from, 'Sorry, bhai tu admin nahi hai😞', id)
                if (!isGroupAdmins) return client.reply(from, 'bhai tu admin nahi hai😞', id)
                await client.sendText(from, menuId.textAdmin())
                break

            case 'donate':
            case 'thankyou':
                await client.sendText(from, menuId.textDonasi())
                break

            case 'animate':
                if ((isMedia || isQuotedImage) && args.length === 0) {
                    const encryptMedia = isQuotedImage ? quotedMsg : message
                    const _mimetype = isQuotedImage ? quotedMsg.mimetype : mimetype
                    const mediaData = await decryptMedia(encryptMedia, uaOverride)
                    const imageBase64 = `data:${_mimetype};base64,${mediaData.toString('base64')}`
                    client.sendMp4AsSticker(from, imageBase64).then(() => {
                        const randomstickerreply = Math.floor(Math.random() * stickerreply.length);
                        client.reply(from, `${stickerreply[randomstickerreply]}`, id)
                        console.log(`Animated Sticker Processed for ${processTime(t, moment())} Second`)
                    })
                }
                break

            // Sticker Creator
            case 'sticker':
            case 'stickers':
            case 'stiker':
                if ((isMedia || isQuotedImage) && args.length === 0) {
                    const encryptMedia = isQuotedImage ? quotedMsg : message
                    const _mimetype = isQuotedImage ? quotedMsg.mimetype : mimetype
                    const mediaData = await decryptMedia(encryptMedia, uaOverride)
                    const imageBase64 = `data:${_mimetype};base64,${mediaData.toString('base64')}`
                    client.sendImageAsSticker(from, imageBase64).then(() => {
                        const randomstickerreply = Math.floor(Math.random() * stickerreply.length);
                        client.reply(from, `${stickerreply[randomstickerreply]}`, id)
                        console.log(`Sticker Processed for ${processTime(t, moment())} Second`)
                    })
                } else if (args[0] === 'nobg') {
                    try {
                        var encryptMedia = isQuotedImage ? quotedMsg : message
                        var apikeys = ["DUFysvGTjP4oo2jjPZYWfCx7", "mLPH7dsZbkacRjrsAJ32pcio", "cm5yM3mXRRyESvPvfErgsyeH", "Szp5DD6N29C2y7asc2jcnHAr", "ZATnyJLxQUMVdJ48RTTiDQu9", "jAuzosSEGUYwEfCgYK3qfV7j"];
                        const randomapi = Math.floor(Math.random() * apikeys.length);
                        const removeapi = apikeys[randomapi];
                        var _mimetype = isQuotedImage ? quotedMsg.mimetype : mimetype
                        var mediaData = await decryptMedia(encryptMedia, uaOverride)
                        var imageBase64 = `data:${_mimetype};base64,${mediaData.toString('base64')}`
                        var base64img = imageBase64
                        var outFile = '././img/noBg.png'
                        var result = await removeBackgroundFromImageBase64({ base64img, apiKey: removeapi, size: 'auto', type: 'auto', outFile })
                        if (result == null) return client.reply(from, `*Limit Reached!!!*\nPlease try after some time!`, id)
                        await fs.writeFile(outFile, result.base64img)
                        await client.sendImageAsSticker(from, `data:${mimetype};base64,${result.base64img}`).then(() => {
                            const randomstickerreply = Math.floor(Math.random() * stickerreply.length);
                            client.reply(from, `${stickerreply[randomstickerreply]}`, id)
                            console.log(`NOBG Sticker Processed for ${processTime(t, moment())} Second`)
                        })
                    } catch (err) {
                        console.log(err)
                    }
                } else {
                    await client.reply(from, 'rehne do beta, tumse na ho payega 😂😂', id)
                }
                break


            case 'stikertoimg':
            case 'stickertoimg':
            case 'stimg':
                if (quotedMsg && quotedMsg.type == 'sticker') {
                    const mediaData = await decryptMedia(quotedMsg)
                    client.reply(from, `In progress! Please wait a moment ... `, id)
                    const imageBase64 = `data:${quotedMsg.mimetype};base64,${mediaData.toString('base64')}`
                    await client.sendFile(from, imageBase64, 'imgsticker.jpg', 'Here is your image!', id)
                        .then(() => {
                            console.log(`Sticker to Image Processed for ${processTime(t, moment())} Seconds`)
                        })
                } else if (!quotedMsg) return client.reply(from, `please tag the sticker you want to use as an image!`, id)
                break


            case 'covid':
                await client.sendText(from, menuId.CovidMenu(pushname))
                break

            case 'covidhelp':
                await client.sendText(from, menuId.CovidHelp(pushname))
                break

            case 'covidstate':
                if (args.length === 0) return client.reply(from, `Please write state name after #covidstate, like #covidstate karnataka`, id)
                console.log(args)
                const options = { download: true, header: true };
                const dataStream = request.get("https://api.covid19india.org/csv/latest/state_wise.csv");
                const parseStream = papa.parse(papa.NODE_STREAM_INPUT, options);
                dataStream.pipe(parseStream);
                let data = [];
                parseStream.on("data", chunk => {
                    data.push(chunk);
                });
                parseStream.on("finish", () => {
                    if (data.filter(data => (data.State).toUpperCase() === (arg).toUpperCase())[0] === undefined) return client.reply(from, `Sorry, ${arg} is not a valid state name`, id)
                    const confirmed = data.filter(data => (data.State).toUpperCase() === (arg).toUpperCase())[0].Confirmed
                    const recovered = data.filter(data => (data.State).toUpperCase() === (arg).toUpperCase())[0].Recovered
                    const deaths = data.filter(data => (data.State).toUpperCase() === (arg).toUpperCase())[0].Deaths
                    const active = data.filter(data => (data.State).toUpperCase() === (arg).toUpperCase())[0].Active
                    client.reply(from, `*${arg.toUpperCase()} COVID 19 Details:* \n\n *Confirmed:* ${confirmed} \n *Recovered:* ${recovered} \n *Deaths:* ${deaths} \n *Active:* ${active} \n\n_Stay Home..🏠 Stay Safe..🦠_`, id)
                });
                break

            case 'coviddistrict':
            case 'covidistrict':
            case 'coviddist':
            case 'covidcity':
                try {
                    if (args.length === 0) return client.reply(from, `Please write city name after #covidcity, like #covidcity patna`, id)
                    if (arg.toUpperCase() === "BENGALURU" || arg.toUpperCase() === "BANGALORE") return client.reply(from, `Bengaluru Urban or Bengaluru Rural ? `, id)
                    if (arg.toUpperCase() === "KANPUR") return client.reply(from, `Kanpur Dehat or Kanpur Nagar? `, id)
                    const options = { download: true, header: true };
                    const dataStream = request.get("https://api.covid19india.org/csv/latest/district_wise.csv");
                    const parseStream = papa.parse(papa.NODE_STREAM_INPUT, options);
                    dataStream.pipe(parseStream);
                    let data = [];
                    parseStream.on("data", chunk => {
                        data.push(chunk);
                    });
                    parseStream.on("finish", () => {
                        if (data.filter(data => (data.District).toUpperCase() === (arg).toUpperCase())[0] === undefined) return client.reply(from, `Sorry, ${arg} is not a valid district name`, id)
                        const confirmed = data.filter(data => (data.District).toUpperCase() === (arg).toUpperCase())[0].Confirmed
                        const recovered = data.filter(data => (data.District).toUpperCase() === (arg).toUpperCase())[0].Recovered
                        const deaths = data.filter(data => (data.District).toUpperCase() === (arg).toUpperCase())[0].Deceased
                        const active = data.filter(data => (data.District).toUpperCase() === (arg).toUpperCase())[0].Active
                        client.reply(from, `*${arg.toUpperCase()} COVID 19 Details:* \n\n *Confirmed:* ${confirmed} \n *Recovered:* ${recovered} \n *Deaths:* ${deaths} \n *Active:* ${active} \n\n_Stay Home..🏠 Stay Safe..🦠_`, id)
                    });
                } catch (err) {
                    console.log(err)
                }
                break


            case 'vaccine':
                try {
                    if (args.length === 0) return client.reply(from, `Please write state name after #vaccine, like #vaccine bihar`, id)
                    var date = new Date();
                    date.setDate(date.getDate() - 1);
                    const yesterday = date.getDate() + '/0' + (date.getMonth() + 1) + '/' + date.getFullYear();
                    const options = { download: true, header: true };
                    const dataStream = request.get("http://api.covid19india.org/csv/latest/cowin_vaccine_data_statewise.csv");
                    const parseStream = papa.parse(papa.NODE_STREAM_INPUT, options);
                    dataStream.pipe(parseStream);
                    let data = [];
                    parseStream.on("data", chunk => {
                        data.push(chunk);
                    });
                    parseStream.on("finish", () => {
                        if (data.filter(data => (data.State).toUpperCase() === (arg).toUpperCase())[0] === undefined) return client.reply(from, `Sorry, ${arg} is not a valid state name`, id)
                        let yesterdaydata = data.filter(function (e) {
                            return e["Updated On"] === yesterday;
                        });
                        var totalr = yesterdaydata.filter(yesterdaydata => (yesterdaydata.State).toUpperCase() === (arg).toUpperCase())[0]["Total Individuals Registered"]
                        const male = yesterdaydata.filter(yesterdaydata => (yesterdaydata.State).toUpperCase() === (arg).toUpperCase())[0]["Male(Individuals Vaccinated)"]
                        const female = yesterdaydata.filter(yesterdaydata => (yesterdaydata.State).toUpperCase() === (arg).toUpperCase())[0]["Female(Individuals Vaccinated)"]
                        const trans = yesterdaydata.filter(yesterdaydata => (yesterdaydata.State).toUpperCase() === (arg).toUpperCase())[0]["Transgender(Individuals Vaccinated)"]
                        const firstdose = yesterdaydata.filter(yesterdaydata => (yesterdaydata.State).toUpperCase() === (arg).toUpperCase())[0]["First Dose Administered"]
                        const seconddose = yesterdaydata.filter(yesterdaydata => (yesterdaydata.State).toUpperCase() === (arg).toUpperCase())[0]["Second Dose Administered"]
                        const covaxin = yesterdaydata.filter(yesterdaydata => (yesterdaydata.State).toUpperCase() === (arg).toUpperCase())[0]["Total Covaxin Administered"]
                        const covishield = yesterdaydata.filter(yesterdaydata => (yesterdaydata.State).toUpperCase() === (arg).toUpperCase())[0]["Total CoviShield Administered"]
                        const totalv = yesterdaydata.filter(yesterdaydata => (yesterdaydata.State).toUpperCase() === (arg).toUpperCase())[0]["Total Individuals Vaccinated"]
                        client.reply(from, `*${arg.toUpperCase()} COVID 19 Latest Vaccination Details:* \n\n * Total Individuals Registered:* ${totalr} \n * Total Male Vaccinated:* ${male} \n * Total Female Vaccinated:* ${female} \n * Total Transgender Vaccinated:* ${trans} \n * Total First Dose Done:* ${firstdose} \n * Total Second Dose Done:* ${seconddose} \n * Total Covaxin Doses:* ${covaxin} \n * Total CoviShield Doses:* ${covishield} \n * Total Individuals Vaccinated:* ${totalv} \n\n *Register yourself for vaccination at:* \nhttps://selfregistration.cowin.gov.in/`, id)
                    });
                } catch (err) {
                    console.log(err)
                }
                break

            case 'makememe':
                if ((isMedia || isQuotedImage) && args.length >= 2) {
                    const top = arg.split('|')[0]
                    const bottom = arg.split('|')[1]
                    const encryptMedia = isQuotedImage ? quotedMsg : message
                    const mediaData = await decryptMedia(encryptMedia, uaOverride)
                    const getUrl = await uploadImages(mediaData, false)
                    const ImageBase64 = await meme.custom(getUrl, top, bottom)
                    client.sendFile(from, ImageBase64, 'image.png', '', null, true)
                        .then((serialized) => console.log(`Successfully sending files with id: ${serialized} processed during ${processTime(t, moment())}`))
                        .catch((err) => console.error(err))
                } else {
                    await client.reply(from, 'tumse na ho payega #menu dekh lo ek bar😂😂', id)
                }
                break

            case 'share':
                client.reply(from, '❤️To start coversation with me click *https://wa.link/mmtouk* \n\n❤️To add me in your group *save my number and add me in your group*', id)
                break

            case 'feedback':
                client.reply(from, 'If you want your commands to be added in the bot write it here and i will add it: https://bit.ly/wa-stickerbot', id)
                break


            // Group Commands (group admin only)

            case 'add':
                if (!isGroupMsg) return client.reply(from, 'Group me bhejo bro!', id)
                if (!isGroupAdmins) return client.reply(from, 'Sorry bhai, tu admin nahi hai', id)
                if (!isBotGroupAdmins) return client.reply(from, 'Pehle mujhe admin to bana🙄', id)
                if (args.length !== 1) return client.reply(from, `Wrong Format, Send #add 9182########`, id)
                try {
                    await client.addParticipant(from, `${args[0]}@c.us`)
                } catch {
                    client.reply(from, 'Sorry bro, nahi add ho payaa', id)
                }
                break


            case 'kick':
            case 'remove':
                if (!isGroupMsg) return client.reply(from, 'Admin nahi hai bhai tu, Sorry😞', id)
                if (!isGroupAdmins) return client.reply(from, 'Admin nahi hai bhai tu, Sorry😞', id)
                if (!isBotGroupAdmins) return client.reply(from, 'Bhai pehle mujhe admin to bana🙄', id)
                if (mentionedJidList.length === 0) return client.reply(from, 'Galat format hai baba😐😐', id)
                if (mentionedJidList[0] === botNumber) return await client.reply(from, 'Mujhe hi nikaaloge saale🙄🙄', id)
                if (groupAdmins.includes(mentionedJidList[i])) return await client.sendText(from, 'saale admin ko hi nikaal de tu😂😂')
                await client.sendTextWithMentions(from, `nikaal diya ${mentionedJidList.map(x => `@${x.replace('@c.us', '')}`).join('\n')} ko`)
                for (let i = 0; i < mentionedJidList.length; i++) {
                    await client.removeParticipant(groupId, mentionedJidList[i])
                }
                break

            case 'leaveall':
                if (!isOwner) return client.reply(from, 'this command is only for Rishabh', id)
                const allGroups = await client.getAllGroups()
                for (let gclist of allGroups) {
                    await client.sendText(gclist.contact.id, `Sorry, Leaving All Groups Due To SPAMS, Please Wait Few Minutes And Add Me Again If You Enjoyed Me`).then(() => client.leaveGroup(gclist.contact.id))
                }
                client.reply(from, 'Success leave all group!', id)
                break

            case 'tagall':
            case 'everyone':
                if (!isGroupMsg) return client.reply(from, 'Sorry, this command can only be used within groups!', id)
                if (!isGroupAdmins) return client.reply(from, 'Failed, this command can only be used by group admins!', id)
                const groupMem = await client.getGroupMembers(groupId)
                let hehex = '╔══✪〘 Mention All 〙✪══\n'
                for (let i = 0; i < groupMem.length; i++) {
                    hehex += '╠➥'
                    hehex += ` @${groupMem[i].id.replace(/@c.us/g, '')}\n`
                }
                hehex += '╚═〘 *J A R V I S* 〙'
                await client.sendTextWithMentions(from, hehex)
                break

            case 'promote':
                if (!isGroupMsg) return await client.reply(from, 'Admin nahi hai bhai tu, Sorry😞', id)
                if (!isGroupAdmins) return await client.reply(from, 'Admin nahi hai bhai tu, Sorry😞', id)
                if (!isBotGroupAdmins) return await client.reply(from, 'Bhai pehle mujhe admin to bana🙄', id)
                if (mentionedJidList.length != 1) return client.reply(from, 'ek ek karke bhai😒', id)
                if (groupAdmins.includes(mentionedJidList[0])) return await client.reply(from, 'Wo pehle se admin hai😒😒', id)
                if (mentionedJidList[0] === botNumber) return await client.reply(from, 'Kabhi kahbhi lagta hai apun hi bhagwaan hai', id)
                await client.promoteParticipant(groupId, mentionedJidList[0])
                await client.sendTextWithMentions(from, ` @${mentionedJidList[0].replace('@c.us', '')} ab admin hai`)
                break

            case 'demote':
                if (!isGroupMsg) return client.reply(from, 'Admin nahi hai bhai tu, Sorry😞', id)
                if (!isGroupAdmins) return client.reply(from, 'Admin nahi hai bhai tu, Sorry😞', id)
                if (!isBotGroupAdmins) return client.reply(from, 'Bhai pehle mujhe admin to bana🙄', id)
                if (mentionedJidList.length !== 1) return client.reply(from, 'ek ek karke bhai😒', id)
                if (!groupAdmins.includes(mentionedJidList[0])) return await client.reply(from, 'Admin nahi hai wo😒😒', id)
                if (mentionedJidList[0] === botNumber) return await client.reply(from, 'mujhe hi demote karoge🙄🙄', id)
                await client.demoteParticipant(groupId, mentionedJidList[0])
                await client.sendTextWithMentions(from, `hata diya @${mentionedJidList[0].replace('@c.us', '')} ko admin se`)
                break

            case 'bye':
                if (!isGroupMsg) return client.reply(from, 'Admin nahi hai bhai tu😜😜', id)
                if (!isGroupAdmins) return client.reply(from, 'Admin nahi hai bhai tu😂😂', id)
                client.sendText(from, 'Bhaga diye naa.. jaa raha hu😭😭').then(() => client.leaveGroup(groupId))
                break


            case 'botstat':
            case 'botstats': {
                const loadedMsg = await client.getAmountOfLoadedMessages()
                const chatIds = await client.getAllChatIds()
                const groups = await client.getAllGroups()
                client.sendText(from, `Status :\n- *${loadedMsg}* Loaded Messages\n- *${groups.length}* Group Chats\n- *${chatIds.length - groups.length}* Personal Chats\n- *${chatIds.length}* Total Chats`)
                break

            }
            default:
                const randomdef = Math.floor(Math.random() * def.length);
                await client.reply(from, `${def[randomdef]}`, id)
                console.log(color('[ERROR]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), 'Unregistered Command from', color(pushname))
                break
        }
    } catch (err) {
        console.error(color(err, 'red'))
    }
}
