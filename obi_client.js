(function(window){
    'use strict';
    function makeid()
    {
    var text = "";
    var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 50; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
    }

    function define_obikey(){
        var ObiKey = {};
        var key_256;
        var listenId;
        var ready = false;
        var myjson;

        ObiKey.setup = function(){
            if(this.ready){return;}
            console.log("setting up..");
            this.myjson = {};
            this.listenId = makeid(); 
            this.key_256 = new Uint8Array(32);
            window.crypto.getRandomValues(this.key_256);
            this.ready = true;
        }

        ObiKey.decode = function(encrypted_info){
            var buffer = new Uint16Array(encrypted_info["data"]);
            var aesCtr = new aesjs.ModeOfOperation.ctr(this.key_256);
            var decryptedBytes = aesCtr.decrypt(buffer);

            var decryptedText = aesjs.util.convertBytesToString(decryptedBytes);
            return JSON.parse(decryptedText);
        }

        ObiKey.sendLongPolling = function(success){
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
            
            var user_info = obikey.decode(result.encrypted_info);
            console.log(user_info);
            success(user_info);

        };
        oReq.ontimeout = function(){
            console.log("timeout");
            this.sendLongPolling();
        }
        
        oReq.open('GET', "http://52.59.25.79/listen/"+this.listenId + bustCache, true);
        oReq.responseType = 'json';
        oReq.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        oReq.send();
    }

        ObiKey.showQR = function(title, qrSelector, permissions, success_callback){
            this.setup();
            
            this.myjson = {version:1, title: title, listenId: this.listenId, key: this.key_256, permissions:permissions};
            console.log(this.myjson);
            var qr = new QRCode(document.getElementById(qrSelector), 
                {   text:JSON.stringify(this.myjson),
                    correctLevel : QRCode.CorrectLevel.L
                });
            this.addButton("qrbutton");
            this.sendLongPolling(function(user_info){
                console.log("success");
                success_callback(user_info);
                console.log(document.getElementById(qrSelector).getElementsByTagName('img')[0])
                document.getElementById(qrSelector).getElementsByTagName('img')[0].src = "https://media.giphy.com/media/eoxomXXVL2S0E/giphy.gif";
            });
        }

        ObiKey.addButton = function(buttonSelector){
            var link_data = encodeURIComponent(JSON.stringify(this.myjson));
                console.log(link_data);
                console.log(link_data.length);
                var complete_url = "obikey://data?d="+link_data;
                console.log(complete_url.indexOf('data?d='));
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
