var rp = require('request-promise');
var _ = require('lodash');
var config = require(appRoot + '/config').emotion;
var express = require('express');
var app = express();
var Q = require('q')

var microsoftFaceAPI = 'https://api.projectoxford.ai/emotion/v1.0/recognize';
var microsoftSentimentAPI = 'https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/sentiment';
var microsoftPhraseAPI = 'https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/keyphrases';


function microsoftFaceCall(picture) {
    var options = {
        url: microsoftFaceAPI,
        method: 'POST',
        json: true,
        headers: {
            'Ocp-Apim-Subscription-Key': config.Ocp_Apim_Subscription_Key,
            'content-type': 'application/json',
        },
        body: { url: picture }
    };
    return rp(options)
}

function microsoftPhraseCall(text) {
    var options = {
        url: microsoftPhraseAPI,
        method: 'POST',
        json: true,
        headers: {
            'Ocp-Apim-Subscription-Key': config.Ocp_Apim_Subscription_Key_Text,
            'content-type': 'application/json',
        },
        body: {
            "documents": [{
                "language": "en",
                "id": "string",
                "text": text
            }]
        }
    };
    return rp(options)
}

function microsoftSentimentCall(text) {
    var options = {
        url: microsoftSentimentAPI,
        method: 'POST',
        json: true,
        headers: {
            'Ocp-Apim-Subscription-Key': config.Ocp_Apim_Subscription_Key_Text,
            'content-type': 'application/json',
        },
        body: {
            "documents": [{
                "language": "en",
                "id": "string",
                "text": text
            }]
        }
    };
    return rp(options)
}


app.get('/face', function(req, res) {

    var pic = req.query.picture;
    microsoftFaceCall(pic).then(function(data) {

        if (data && data.length == 1) {
            var response = {};
            response.faceCount = 1;
            response.score = _.chain(data[0].scores).values().max().value();
            response.emotion = _.findKey(data[0].scores, function(o) {
                return o == response.score;
            });
            response.pic = pic;
            res.json(response);
        } else {
            res.json({
                faceCount: data ? data.length : 0
            });
        }
    }).catch(function(err) {
        console.log(err.stack);
        res.sendStatus(400);
    });
});



app.get('/textanalyze', function(req, res) {

    var text = req.query.string;
    var response = {};
    var promises = [];

    promises.push(microsoftSentimentCall(text));
    promises.push(microsoftPhraseCall(text));
    return Q.all(promises).then(function(data) {
        response.sentiment = data[0].documents[0].score;
        if (response.sentiment < .40) {
            response.feeling = 'negative';
        } else if (response.sentiment < .60) {
            response.feeling = "neutral";
        } else {
            response.feeling = "positive";
        }
        response.phrase = data[1].documents[0].keyPhrases;
    }).then(function(data) {
        res.json(response);
    }).catch(function(err) {
        console.log(err.stack);
        res.sendStatus(400);
    });
});




module.exports = app;
