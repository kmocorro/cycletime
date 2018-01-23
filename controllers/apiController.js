let bodyParser = require('body-parser');
let Promise = require('bluebird');
let mysqlLocal = require('../dbconfig/dbLocal');
let mysqlCloud = require('../dbconfig/dbCloud');
let mysqlMES = require('../dbconfig/dbMES');
let moment = require('moment');
let nodemailer = require('nodemailer');
let fs = require('fs');
let XLSX = require('xlsx');
let Email = require('email-templates');
let memwatch = require('memwatch-next');

module.exports = function(app){

    memwatch.on('leak', (info) => {
        console.error('Memory leak detected:\n', info);
    });

    app.use(bodyParser.json({limit: '50mb'}));
    app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

    app.get('/', function(req, res){
        res.render('index', {ip: req.ip});
    });

    app.post('/api/rawct', function(req, res){ // for raw cycle time
        let post_auth = req.body;

        //  prevent incomplete post possible error
        if( typeof post_auth.user == 'undefined' || typeof post_auth.password == 'undefined' || typeof post_auth.date2extract == 'undefined' || typeof post_auth.transaction == 'undefined' ) {

            res.send('You have no transaction here...');

        } else {

            function checkPOSTauth(){
                return new Promise(function(resolve, reject){
                    mysqlCloud.poolCloud.getConnection(function(err, connection){
                        connection.query({
                            sql:'SELECT * FROM tbl_admin_auth WHERE user = ? AND pass = ?', // verify @ cloudDB if the same user & pass
                            values:[post_auth.user, post_auth.password]
                        }, function(err, results, fields){
                            let checkPOSTAuth_obj = [];
    
                            if(typeof results != 'undefined' || results != null){
                                
                                checkPOSTAuth_obj.push({
                                    user: results[0].user,
                                    pass: results[0].pass,
                                    auth: results[0].hasAuth,
                                    auth_status: 'Access Granted!'
                                });
                                
                                resolve(checkPOSTAuth_obj);
                                checkPOSTAuth_obj = null; // trial
    
                            } else {
                                res.send(' Error 101 : POST AUTH');
                            }
    
                        });
                        connection.release();
                    });
                });
            }
    
            function queryRawCycleTime(){
                return new Promise(function(resolve, reject){
                    mysqlMES.poolMES.getConnection(function(err, connection){
                        connection.query({
                            sql: 'SET @@session.time_zone = "+08:00"' 
                        },  function(err, results, fields){
                        });
    
                        connection.query({
                            sql: 'SELECT ROUND(TIME_TO_SEC(TIMEDIFF(DAMAGE_OUT, DAMAGE_IN))/3600,2) AS DAMAGE,ROUND(TIME_TO_SEC(TIMEDIFF(POLY_OUT, DAMAGE_OUT))/3600,2) AS POLY,ROUND(TIME_TO_SEC(TIMEDIFF(BSG_OUT, POLY_OUT))/3600,2) AS BSGDEP,ROUND(TIME_TO_SEC(TIMEDIFF(NTM_OUT, BSG_OUT))/3600,2) AS NTM,ROUND(TIME_TO_SEC(TIMEDIFF(NOXE_OUT, NTM_OUT))/3600,2) AS NOXE,ROUND(TIME_TO_SEC(TIMEDIFF(NDEP_OUT, NOXE_OUT))/3600,2) AS NDEP,ROUND(TIME_TO_SEC(TIMEDIFF(PTM_OUT, NDEP_OUT))/3600,2) AS PTM,ROUND(TIME_TO_SEC(TIMEDIFF(TOXE_OUT, PTM_OUT))/3600,2) AS TOXE,ROUND(TIME_TO_SEC(TIMEDIFF(CLEANTEX_OUT, TOXE_OUT))/3600,2) AS CLEANTEX,ROUND(TIME_TO_SEC(TIMEDIFF(PDRIVE_OUT, CLEANTEX_OUT))/3600,2) AS PDRIVE,ROUND(TIME_TO_SEC(TIMEDIFF(ARC_BARC_OUT, PDRIVE_OUT))/3600,2) AS OLT,ROUND(TIME_TO_SEC(TIMEDIFF(PBA_OUT, ARC_BARC_OUT))/3600,2) AS PBA,ROUND(TIME_TO_SEC(TIMEDIFF(LCM_OUT, PBA_OUT))/3600,2) AS LCM, ROUND(TIME_TO_SEC(TIMEDIFF(SEED_OUT, LCM_OUT))/3600,2) AS SEED, ROUND(TIME_TO_SEC(TIMEDIFF(FGA_OUT, SEED_OUT))/3600,2) AS FGA, ROUND(TIME_TO_SEC(TIMEDIFF(PLM_OUT, FGA_OUT))/3600,2) AS PLM, ROUND(TIME_TO_SEC(TIMEDIFF(EDGECOAT_OUT, PLM_OUT))/3600,2) AS EDGECOAT, ROUND(TIME_TO_SEC(TIMEDIFF(PLATING_OUT, EDGECOAT_OUT))/3600,2) AS PLATING, ROUND(TIME_TO_SEC(TIMEDIFF(ETCHBACK_OUT, PLATING_OUT))/3600,2) AS ETCHBACK FROM fab4_cycle_times.LOT_CT WHERE DATE(DATE_ADD(ETCHBACK_OUT, INTERVAL -390 MINUTE)) = ?',
                            //DATE(DATE_ADD(CURDATE(), INTERVAL -1 DAY))
                            values: [post_auth.date2extract]
                        },  function(err, results, fields){
    
                            if (typeof results != 'undefined' || results != null){
    
                                let rows = '';
    
                                for (let i in results) {
                                    rows += results[i].DAMAGE + ',';
                                    rows += results[i].POLY + ',';
                                    rows += results[i].BSGDEP + ',';
                                    rows += results[i].NTM + ',';
                                    rows += results[i].NOXE + ',';
                                    rows += results[i].NDEP + ',';
                                    rows += results[i].PTM + ',';
                                    rows += results[i].TOXE + ',';
                                    rows += results[i].CLEANTEX + ',';
                                    rows += results[i].PDRIVE + ',';
                                    rows += results[i].OLT + ',';
                                    rows += results[i].PBA + ',';
                                    rows += results[i].LCM + ',';
                                    rows += results[i].SEED + ',';
                                    rows += results[i].FGA + ',';
                                    rows += results[i].PLM + ',';
                                    rows += results[i].EDGECOAT + ',';
                                    rows += results[i].PLATING + ',';
                                    rows += results[i].ETCHBACK + '\n';
                                }
                                    
                                fs.writeFile( './public/raw/' + post_auth.date2extract + '.csv', rows, function (err) {
                                    if (err) throw err;
                                    //console.log('Saved!')
                                    resolve(rows); 

                                    rows = null // trial

                                });
    
                            } else { // no data coming from mysqlmes
                                reject('nodata');
                            }
                            
                        });
                        connection.release();
                    });
                });
            }
    
            checkPOSTauth().then(function(checkPOSTAuth_obj){
                if(checkPOSTAuth_obj[0].auth == 1){
                    return queryRawCycleTime().then(function(rows){
                        res.send(' raw CT has been saved');
                    }).catch(function(reject){
                        res.send(' cant access raw cycle time db');
                    });
                }
            });

        }

    });


    app.post('/api/mailer', function(req, res){ // automailer api
        let post_auth = req.body;

        //  prevent incomplete post possible error
        if( typeof post_auth.user == 'undefined' || typeof post_auth.password == 'undefined' || typeof post_auth.date2extract == 'undefined' || typeof post_auth.transaction == 'undefined' ) {

            res.send('You have no transaction here...');

        } else {

            function checkPOSTauth(){
                return new Promise(function(resolve, reject){
                    mysqlCloud.poolCloud.getConnection(function(err, connection){
                        connection.query({
                            sql:'SELECT * FROM tbl_admin_auth WHERE user = ? AND pass = ?', // verify @ cloudDB if the same user & pass
                            values:[post_auth.user, post_auth.password]
                        }, function(err, results, fields){
                            let checkPOSTAuth_obj = [];
    
                            if(typeof results != 'undefined' || results != null){
                                
                                checkPOSTAuth_obj.push({
                                    user: results[0].user,
                                    pass: results[0].pass,
                                    auth: results[0].hasAuth,
                                    auth_status: 'Access Granted!'
                                });
                                
                                resolve(checkPOSTAuth_obj);
                                checkPOSTAuth_obj = null; // trial
    
                            } else {
                                res.send(' Error 101 : POST AUTH');
                            }
    
                        });
                        connection.release();
                    });
                });
            }
    
            function authMailer(){
                return new Promise(function(resolve, reject){
                    mysqlCloud.poolCloud.getConnection(function(err, connection){
                        connection.query({
                            sql: 'SELECT * FROM tbl_auth_mail'
                        },  function(err, results, fields){
                            let authMailer_obj = [];
    
                                if(typeof results != 'undefined' || results != null){
    
                                    authMailer_obj.push({
                                        host: results[0].host,
                                        port: results[0].port,
                                        user: results[0].user,
                                        pass: results[0].pass,
                                        cipher: results[0].cipher,
                                        hasAuth: results[0].hasAuth
                                    });
    
                                    resolve(authMailer_obj);
                                    
                                    authMailer_obj = null; //trial

                                } else {
                                    res.send(' Error 102 : AUTH MAILER');
                                }
                        });
                        connection.release();
                    });
                });
            }
    
            function toRecipient(){
                return new Promise(function(resolve, reject){
                    mysqlCloud.poolCloud.getConnection(function(err, connection){
                        connection.query({
                            sql: 'SELECT to_mail, isActive, position FROM tbl_mail_recipients GROUP BY to_mail ORDER BY position'
                        },  function(err, results, fields){
                            let toRecipient_arr = [];
    
                                if(typeof results != 'undefined' || results != null){
    
                                    for(let i=0;i<results.length;i++){
    
                                        if(results[i].isActive == 1){
                                            if(results[i].position == 'admin' || results[i].position == 'manager' || results[i].position == 'supervisor' || results[i].position == 'engineer'){
    
                                                toRecipient_arr.push(
                                                    results[i].to_mail
                                                );
        
                                            }
                                        }
                        
                                    }
    
                                    resolve(toRecipient_arr);
                                    toRecipient_arr = null; //trial
    
                                } else {
                                    res.send(' Error 103 : RECIPIENTS ');
                                }
                        });
                        connection.release();
                    });
                });
            }
    
            function toAdmin(){
                return new Promise(function(resolve, reject){
                    mysqlCloud.poolCloud.getConnection(function(err, connection){
                        connection.query({
                            sql: 'SELECT * FROM tbl_mail_recipients WHERE position = "admin"'
                        },  function(err, results, fields){
                            let toAdmin_arr = [];
    
    
                            if(typeof results != 'undefined' || results != null){
    
                                for(let i=0;i<results.length;i++){
    
                                    if(results[i].isActive == 1){
                                        if(results[i].position == 'admin'){
                                            toAdmin_arr.push(
                                                results[i].to_mail
                                            )
                                        }
                                    }
                                }
    
                                resolve(toAdmin_arr);

                                toAdmin_arr = null; //trial
                            } else {
    
                                res.send(' Error 104: Error to Admin');
                            }
                            
                        });
                    });
                });
            }
    
            checkPOSTauth().then(function(checkPOSTAuth_obj){
    
                if(checkPOSTAuth_obj[0].auth == 1){
                    return authMailer().then(function(authMailer_obj){
                        return toRecipient().then(function(toRecipient_arr){
                            return toAdmin().then(function(toAdmin_arr){
    
                                if(post_auth.transaction == 'cycletime'){ // cycletime sender
    
                                    let XLSXworkbook = XLSX.readFile('./public/attachment/' + post_auth.date2extract + '.xlsx');
                                    let XLSXworksheetCT = XLSXworkbook.Sheets['summary'];
                                    let XLSXworksheetFF = XLSXworkbook.Sheets['ff'];
        
                                    let summaryJSON = XLSX.utils.sheet_to_json(XLSXworksheetCT);
                                    let ffJSON =  XLSX.utils.sheet_to_json(XLSXworksheetFF);
        
                                    nodemailer.createTestAccount((err, account) => { // mailer gogo
                                        //console.log('running nodemailer...');
                                        // recipients to string
                                        let recipientsToString = toRecipient_arr.join(", "); // join array with comma
                                        let dateExtracted = moment(new Date()).subtract('1', 'day');
                                        let dateTosend = moment(dateExtracted).format('llll');
                                        
                                        //  create template based sender
                                        let transporter = nodemailer.createTransport({
                                        host: authMailer_obj[0].host,
                                        port: authMailer_obj[0].port,
                                        secure: false, // we're using TLS here
                                            auth: {
                                                user: authMailer_obj[0].user,
                                                pass: authMailer_obj[0].pass
                                            },
                                            tls: {
                                                ciphers: authMailer_obj[0].cipher
                                            }
                                        });
                                            
                                            // using email-templates
                                        let email = new Email({
                                            message : {
                                                from :'"Auto Mailer" <' + authMailer_obj[0].user + '>',
                                            },
                                            transport: transporter
                                        });

                                        // using pug/jade templating as email template
                                        
                                        email.send({
                                            template: 'template',
                                            locals: {
                                                htmlDate: dateTosend,
                                                tableJSON : summaryJSON,
                                                ffTableJson: ffJSON,
                                                admin: toAdmin_arr[0]
                                            },
                                            message: {
                                                to: recipientsToString,
                                                subject:  'Fab4 Cycle Time & Flow Factor | ' + dateTosend ,
                                                attachments : [
                                                    {
                                                        filename: post_auth.date2extract + '-fab4-cycle-time-and-flow-factor' + '.xlsx',
                                                        path: './public/attachment/' + post_auth.date2extract + '.xlsx'
                                                    }
                                                ] 
                                            }
                                                
                                        })
                                        .then(function(){
                                            //console.log;
                                            //console.log('Sent');
                                            res.send(' message sent');
                                        })
                                        .catch(console.error);
    
                                    });
    
                                
                                } 
                                
                                if(post_auth.transaction == 'outsNwip') { // outs and wip sender
                                    res.send('soon');
                                }
                                
                            });
                        });
                    });
                }
    
            });


        }
        

    });
    
}