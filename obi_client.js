(function(window){
    'use strict';
    function makeid()
    {
    var text = "";
    var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 20; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
    }

    function define_obikey(){
        var ObiKey = {};
        var key_256;
        var key_256_str;
        var listenId;
        var ready = false;
        var myjson;
        var my_qr;

        ObiKey.setup = function(){
            if(this.ready){return;}
            console.log("setting up..");
            this.myjson = {};
            this.listenId = makeid(); 
            this.key_256 = new Uint8Array(32);

            window.crypto.getRandomValues(this.key_256);
            this.key_256_str = aesjs.util.convertBytesToString(this.key_256, 'hex')
            this.ready = true;
        }

        ObiKey.clearQR = function(){
            if(this.my_qr && (typeof this.my_qr.clear) === 'function'){
                console.log("clearing QR");
                this.my_qr.clear();
            }
        }

        ObiKey.reset = function(){
            this.ready = false;
            this.clearQR();
            this.setup();
        }

        ObiKey.decode = function(encrypted_info, ctr){
            var buffer = new Uint16Array(encrypted_info["data"]);
            console.log("buffer:");
            console.log(buffer);
            var aesCtr = new aesjs.ModeOfOperation.ctr(this.key_256, new aesjs.Counter(parseInt(ctr)));
            var decryptedBytes = aesCtr.decrypt(buffer);
            var decryptedText = aesjs.util.convertBytesToString(decryptedBytes);
            console.log("decryptedText:");
            console.log(decryptedText);
            return JSON.parse(decryptedText);
        }

        ObiKey.sendLongPolling = function(success, error_callback){
            var obikey = this;
        console.log("sending long polling..");
        var bustCache = '?p=' + new Date().getTime();
        var oReq = new XMLHttpRequest();
        oReq.onload = function (e) {
            console.log(e);
            var xhr = e.target;
            console.log('Inside the onload event');
            var result;
            if (xhr.responseType === 'json') {
                result = xhr.response;
            } else {
                result = JSON.parse(xhr.responseText);
            }
            console.log('result:');
            console.log(result);

            //check hmac

            var shaObj = new jsSHA("SHA-256", "HEX");
            shaObj.setHMACKey('obikey', "TEXT");
            var buffer = new Uint16Array(result.encrypted_info["data"]);
            shaObj.update(aesjs.util.convertBytesToString(buffer, "HEX"));
            var hmac = shaObj.getHMAC("HEX");

            console.log("calculated hmac:"+hmac);
            console.log("request    hmac:"+result.hmac);

            if(hmac != result.hmac){
                console.log("HMAC Error");
                error_callback("HMAC Error");
                return;
            }
            var user_info = obikey.decode(result.encrypted_info, result.ctr);
            console.log("user info:");
            console.log(user_info);
            success(user_info);

        };
        oReq.ontimeout = function(){
            console.log("timeout");
            obikey.sendLongPolling(success, error_callback);
        }
        
        oReq.open('GET', "https://aurora.obikey.com/listen/"+this.listenId + bustCache, true);
        oReq.responseType = 'json';
        oReq.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        oReq.send();
    }

    ObiKey.showQRWithOptions = function(options, success_callback, error_callback){
        if(!('title' in options) || 
            !('permissions' in options) ||
            !('qrSelectorId' in options)){
            error_callback("Wrong arguments");
            return;
        }
        this.setup();
        this.myjson = {version:1,
            title: options['title'],
            listenId: this.listenId,
            key: this.key_256_str,
            permissions:options['permissions']};

        if('token' in options){
            this.myjson['t'] = options['token'];
        }

        var qrSelector = options['qrSelectorId'];
        this.clearQR();
        document.getElementById(options['qrSelectorId']).innerHTML = '';
        this.my_qr = new QRCode(document.getElementById(options['qrSelectorId']), 
                {   text:JSON.stringify(this.myjson),
                    correctLevel : QRCode.CorrectLevel.L
                });
        this.sendLongPolling(function(user_info){
                success_callback(user_info);
                // document.getElementById(qrSelector).getElementsByTagName('img')[0].src = "https://media.giphy.com/media/eoxomXXVL2S0E/giphy.gif";
            }, (err)=> {console.log(err);});
        
    }

        ObiKey.showQR = function(title, qrSelector, permissions, success_callback){
            this.setup();
            
            this.myjson = {version:1, title: title, listenId: this.listenId, key: this.key_256_str, permissions:permissions};
            console.log(this.myjson);
            this.clearQR();
            document.getElementById(options['qrSelectorId']).innerHTML = '';
            this.my_qr = new QRCode(document.getElementById(qrSelector), 
                {   text:JSON.stringify(this.myjson),
                    correctLevel : QRCode.CorrectLevel.L
                });
            this.addButton("qrbutton");
            this.sendLongPolling(function(user_info){
                console.log("success");
                success_callback(user_info);
                // console.log(document.getElementById(qrSelector).getElementsByTagName('img')[0])
                // document.getElementById(qrSelector).getElementsByTagName('img')[0].src = "https://media.giphy.com/media/eoxomXXVL2S0E/giphy.gif";
            }, (err)=> {console.log(err);});
        }

        ObiKey.addButton = function(buttonSelector){
            var link_data = encodeURIComponent(JSON.stringify(this.myjson));
                console.log(link_data);
                console.log(link_data.length);
                var complete_url = "obikey://data?d="+link_data;
                console.log(complete_url.indexOf('data?d='));
                return;
            document.getElementById(buttonSelector).addEventListener("click", function(e) {
                
                window.open(complete_url);
                e.preventDefault();
            });
        }
        return ObiKey;
    }
    //define globally if it doesn't already exist
    if(typeof(Obikey) === 'undefined'){
        window.ObiKey = define_obikey();
        

    }
    else{
        console.log("ObiKey already defined.");
    }

    
    
    
})(window);
