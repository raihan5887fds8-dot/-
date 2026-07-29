/* =========================================================================
   বন্ধু ঐক্য সমবায় সমিতি — Backend (Google Apps Script)
   এই ফাইলটা আপনার Google Sheet-এর Extensions > Apps Script এ পেস্ট করুন,
   তারপর Deploy > New deployment > Web app হিসেবে ডিপ্লয় করুন।
   (বিস্তারিত ধাপ README.md ফাইলে দেয়া আছে)
   ========================================================================= */

const SHEETS = {
  USERS:   'ইউজার',
  CONTRIB: 'চাঁদা',
  INVEST:  'ইনভেস্টমেন্ট',
  INVEST_UPDATE: 'ইনভেস্টমেন্ট_আপডেট',
  INVEST_INSTALLMENT: 'ইনভেস্টমেন্ট_কিস্তি',
  CUSTODIAN: 'আদাল',
  BABY: 'বাচ্চা',
  BABY_UPDATE: 'বাচ্চা_আপডেট',
  EXPENSE: 'খরচ',
  NOTICE:  'নোটিশ',
  POLL:    'ভোট',
  VOTES:   'ভোট_ফলাফল',
  TRANSACTION: 'লেনদেন',
  RULES:   'নিয়মাবলী'
};

/* 'বাকি বিক্রয় (মুরাবাহা)' — ইনভেস্টমেন্টের একটা বিশেষ ধরন, যেখানে সমিতি
   পণ্য ক্রয় করে গ্রাহকের কাছে অগ্রিম-ঘোষিত লাভে বিক্রি করে এবং কিস্তিতে
   টাকা আদায় করে। এটা আলাদা কোনো মডিউল না — ইনভেস্টমেন্ট সিস্টেমেরই অংশ। */
const SALE_TYPE = 'বাকি বিক্রয় (মুরাবাহা)';

const HEADERS = {
  'ইউজার':        ['ID','ইউজারনেম','নাম','ফোন','পাসওয়ার্ড_হ্যাশ','রোল','স্ট্যাটাস','যোগদানের_তারিখ'],
  'চাঁদা':        ['ID','সদস্য_ID','সদস্যের_নাম','মাস','পরিমাণ','মাধ্যম','ট্রানজেকশন_আইডি','স্ট্যাটাস','জমার_তারিখ','যাচাইকারী','যাচাইয়ের_তারিখ'],
  'ইনভেস্টমেন্ট': ['ID','শিরোনাম','ধরন','বিনিয়োগ_টাকা','বর্তমান_মূল্য','লাভ_ক্ষতি','অবস্থা','শুরুর_তারিখ','পরিচালক','প্রমাণ_লিংক','বিবরণ','সর্বশেষ_আপডেট',
                    'বিক্রয়মূল্য','গ্রাহকের_নাম','গ্রাহকের_ফোন','গ্রাহকের_ঠিকানা','মোট_কিস্তি','পরিশোধিত_কিস্তি','পরিশোধিত_টাকা','বাকি_টাকা',
                    'বাচ্চা_সংখ্যা','লিঙ্গ','আদাল_ID','আদালের_নাম','আদালের_ফোন','আদালের_ঠিকানা','উৎস_বাচ্চা_ID'],
  'ইনভেস্টমেন্ট_আপডেট': ['ID','ইনভেস্টমেন্ট_ID','ছবি_লিংক','নোট','সদস্য_ID','সদস্যের_নাম','সদস্যের_ফোন','তারিখ'],
  'ইনভেস্টমেন্ট_কিস্তি': ['ID','ইনভেস্টমেন্ট_ID','কিস্তি_নম্বর','পরিমাণ','মাধ্যম','আদায়কারী','তারিখ'],
  /* আদাল = যাকে গরু/ছাগল "আদি" (শেয়ারে পালনের জন্য) দেওয়া হয় — এটা শুধু একটা
     ডিরেক্টরি, যাতে একই আদালকে বারবার বাচ্চা দিলে নতুন করে তথ্য লিখতে না হয় */
  'আদাল':         ['ID','নাম','ফোন','ঠিকানা','তারিখ'],
  /* মা প্রাণীর বাচ্চা জন্ম নিলে এখানে একটা রো তৈরি হয় (অবস্থা='সক্রিয়')।
     পরে বাচ্চাটা আদালকে দিলে (নতুন ইনভেস্টমেন্ট তৈরি হয়ে) বা বিক্রি হলে বা
     মারা গেলে অবস্থা বদলে যায় এবং প্যারেন্ট ইনভেস্টমেন্টের 'বাচ্চা_সংখ্যা' কমে যায় */
  'বাচ্চা':       ['ID','ইনভেস্টমেন্ট_ID','ক্রম','লিঙ্গ','ছবি_লিংক','নোট','অবস্থা','নতুন_ইনভেস্টমেন্ট_ID','তৈরির_তারিখ','সর্বশেষ_আপডেট'],
  'বাচ্চা_আপডেট': ['ID','বাচ্চা_ID','ছবি_লিংক','নোট','সদস্য_ID','সদস্যের_নাম','সদস্যের_ফোন','তারিখ'],
  'খরচ':          ['ID','শিরোনাম','পরিমাণ','তারিখ','এন্ট্রিকারী','বিবরণ'],
  'নোটিশ':        ['ID','শিরোনাম','বিস্তারিত','তারিখ','প্রকাশক','জরুরি'],
  'ভোট':          ['ID','প্রশ্ন','অপশন','প্রকাশক','তারিখ','স্ট্যাটাস','গোপনীয়তা'],
  'ভোট_ফলাফল':   ['ID','ভোট_ID','সদস্য_ID','বাছাই','তারিখ'],
  /* ফিল্ড পরিচালক বা ম্যানেজার যেকোনো খাতে (চাঁদা আদায়, কিস্তি আদায়, বিক্রয়,
     অন্য যেকোনো নগদ প্রাপ্তি) হাতে টাকা পেলে তা নিজের কাছে না রেখে এখানে
     সাবমিট করবেন — ক্যাশিয়ার যাচাই করলে তবেই সেটা কার্যকর ধরা হবে।
     ক্যাশিয়ার বাতিল করলে কারণসহ সাবমিটকারীর কাছে ফেরত যায়; সাবমিটকারী তখন
     হয় এন্ট্রিটা পুরোপুরি মুছে দিতে পারবেন (যেন কখনো হয়ইনি), অথবা সংশোধন
     করে আবার পাঠাতে পারবেন। */
  'লেনদেন':       ['ID','ধরন','সংশ্লিষ্ট_তথ্য','পরিমাণ','বিবরণ','সাবমিটকারী_ID','সাবমিটকারীর_নাম','সাবমিটকারীর_পদ',
                    'স্ট্যাটাস','বাতিলের_কারণ','জমার_তারিখ','যাচাইকারী','যাচাইয়ের_তারিখ'],
  /* সমিতির গঠনতন্ত্র/নীতিমালা — 'বিভাগ' দিয়ে নিয়মগুলো গ্রুপ করে দেখানো হয়
     (যেমন: 'আয়ের উৎস', 'আয়, ব্যয় ও হিসাবরক্ষণ') এবং 'ক্রম' দিয়ে একই বিভাগের
     মধ্যে সাজানোর ক্রম ঠিক থাকে। যেকোনো লগইনকৃত ইউজার শুধু পড়তে পারবেন;
     যোগ/সম্পাদনা/মুছে ফেলা শুধু ম্যানেজারের কাজ (নিচে ROLE_GUARD দ্রষ্টব্য)। */
  'নিয়মাবলী':    ['ID','ক্রম','বিভাগ','বিষয়বস্তু','সংযোজনকারী','তারিখ']
};


const MANAGER = 'ম্যানেজার';
const CASHIER = 'ক্যাশিয়ার';
const FIELD_DIRECTOR = 'ফিল্ড_পরিচালক';
const MEMBER = 'সদস্য';

// লেনদেনের ধরন — ফ্রন্টএন্ডে ব্যবহৃত TXN_TYPE_INSTALLMENT / TXN_TYPE_INVEST_CASH
// এর সাথে টেক্সট হুবহু মিলিয়ে রাখা হলো, যাতে ব্যাকএন্ডে ভেরিফাই করার সময়
// ধরন অনুযায়ী সঠিক আপডেট করা যায়
const TXN_TYPE_INSTALLMENT = 'কিস্তি আদায়';
const TXN_TYPE_INVEST_CASH = 'ইনভেস্টমেন্ট থেকে প্রাপ্ত টাকা';

/* ---------------- sheet helpers ---------------- */
function getSheet_(name){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if(!sheet){
    sheet = ss.insertSheet(name);
  }
  if(sheet.getLastRow() === 0){
    sheet.appendRow(HEADERS[name]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function ensureAllSheets_(){
  Object.values(SHEETS).forEach(name=>{
    getSheet_(name);
    ensureHeaderColumns_(name);
  });
  seedDefaultRules_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const blank = ss.getSheetByName('Sheet1');
  if(blank && blank.getLastRow() === 0 && ss.getSheets().length > 1){
    ss.deleteSheet(blank);
  }
}

/* যদি কোনো শিট আগে থেকেই তৈরি থাকে কিন্তু নতুন ফিচারের জন্য নতুন কলাম
   (যেমন: বাকি বিক্রয়ের গ্রাহক/কিস্তি সংক্রান্ত কলাম) তাতে না থাকে, তাহলে
   এই ফাংশনটা সেই মিসিং কলামগুলো হেডার সারিতে যোগ করে দেয় — কোনো ম্যানুয়াল
   কাজ ছাড়াই পুরোনো শিট নতুন গঠনের সাথে সামঞ্জস্যপূর্ণ হয়ে যায়। */
function ensureHeaderColumns_(sheetName){
  const sheet = getSheet_(sheetName);
  const expected = HEADERS[sheetName];
  if(!expected) return;
  const lastCol = Math.max(1, sheet.getLastColumn());
  const existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const missing = expected.filter(h => existing.indexOf(h) === -1);
  if(missing.length){
    sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  }
}

/* সমিতির প্রতিষ্ঠাকালীন গঠনতন্ত্র/নীতিমালা — 'নিয়মাবলী' শিট একেবারে ফাঁকা
   থাকা অবস্থায় (অর্থাৎ প্রথমবার, অথবা ম্যানেজার ইচ্ছাকৃতভাবে সব নিয়ম মুছে
   ফেলার পর নয় — শুধু হেডার-ছাড়া-কিছু-নেই অবস্থায়) এখানে দেওয়া মূল ১২টি
   নিয়ম স্বয়ংক্রিয়ভাবে যোগ হয়ে যায়, যাতে ম্যানেজারকে হাতে টাইপ করে বসাতে
   না হয়। এরপর ম্যানেজার চাইলে যেকোনো নিয়ম এডিট/মুছে/নতুন করে যোগ করতে
   পারবেন — শিটে অন্তত একটা রো থেকে গেলে এই ফাংশন আর কিছু করে না। */
function seedDefaultRules_(){
  const sheet = getSheet_(SHEETS.RULES);
  if(sheet.getLastRow() > 1) return;
  const now = nowIso_();
  const defaults = [
    ['সাধারণ', 'এটি একটি সমবায় প্রতিষ্ঠান।'],
    ['আয়ের উৎস', 'প্রতি মাসের ৮ থেকে ১৫ তারিখের মধ্যে প্রতিজন সদস্য ৫০০ টাকা করে প্রদান করবেন।'],
    ['আয়ের উৎস', 'প্রতি মাসের টাকা নির্দিষ্ট তারিখের মধ্যে না পৌঁছালে প্রতিদিনের জন্য শতকরা ৩ টাকা হারে জরিমানা প্রদান করতে হবে। পরপর তিন মাস টাকা জমা না দিলে সদস্যপদ স্থগিত করা হবে; পরবর্তীতে সংখ্যাগরিষ্ঠ সদস্যের মতামতের ভিত্তিতে এই বিষয়ে সিদ্ধান্ত নেয়া হবে।'],
    ['আয়ের উৎস', 'বিভিন্ন ইনভেস্টমেন্টের মাধ্যমে আয় করা হবে, তবে কোনো ইনভেস্টমেন্ট বাস্তবায়নের লক্ষ্যে শতকরা ৭০% সদস্যের সম্মতি লাগবে।'],
    ['আয়ের উৎস', 'ইনভেস্টমেন্টের পর প্রতিটি ইনভেস্টমেন্টের জন্য একজন করে সদস্য দায়িত্বে থাকবেন এবং তিনি মাসে একবার করে সেই ইনভেস্টমেন্টের উপর প্রতিবেদন জমা দেবেন।'],
    ['আয়, ব্যয় ও হিসাবরক্ষণ', 'নির্দিষ্ট একজন ব্যক্তির কাছে টাকা রাখা হবে, তবে খুব দ্রুত সময়ের মধ্যে যৌথ অ্যাকাউন্টের ব্যবস্থা করতে হবে।'],
    ['আয়, ব্যয় ও হিসাবরক্ষণ', 'যে সদস্যের দায়িত্বে টাকা রাখা হবে তিনি প্রতি সপ্তাহে প্রমাণসহ টাকার প্রতিবেদন WhatsApp গ্রুপে জমা দেবেন।'],
    ['আয়, ব্যয় ও হিসাবরক্ষণ', 'যে ব্যক্তির কাছে টাকা রাখা হবে তিনি ব্যতীত অন্য একজন ব্যক্তি হিসাবরক্ষণ করবেন এবং ওয়েবসাইটে প্রতিবেদন জমা দেবেন।'],
    ['আয়, ব্যয় ও হিসাবরক্ষণ', 'প্রতি মাসের শেষ শুক্রবার একটিভ ভার্চুয়াল সাধারণ সভা অনুষ্ঠিত হবে, যেখানে সকল বিষয়ে আলোচনা করা হবে। পরপর দুইবার সাধারণ সভায় উপস্থিত না হলে ১০০ টাকা জরিমানা দিতে হবে।'],
    ['আয়, ব্যয় ও হিসাবরক্ষণ', 'নতুন সদস্য গ্রহণের ক্ষেত্রে একমাস পূর্বে সকলকে সাধারণ সভায় অবহিত করতে হবে; একমাস পরে সাধারণ সভায় শতকরা ৮০% সদস্যের সম্মতিতে গ্রহণ করতে হবে, অন্যথায় গ্রহণ করা যাবে না।'],
    ['আয়, ব্যয় ও হিসাবরক্ষণ', 'মূল সম্পদ ৭ লাখ টাকা হওয়ার পূর্বে কেউ প্রফিটের ভাগ পাবেন না। মূল সম্পদ ৭ লাখ টাকা হওয়ার পর প্রতিবছর হিসাব করে প্রফিটের ৪০% টাকা সকল সদস্যের মাঝে নির্দিষ্ট হারে বিতরণ করা হবে এবং বাকি ৬০% টাকা মূল সম্পদের সাথে যোগ হবে। তবে কোনোভাবেই মাসে ৫০০ টাকা করে দেওয়া বন্ধ হবে না।'],
    ['আয়, ব্যয় ও হিসাবরক্ষণ', 'উপরের যেকোনো নিয়ম-নীতির সংশোধন, সংযোজন, পরিমার্জন অথবা নতুন কোনো নীতি তৈরি কিংবা বাতিলের ক্ষেত্রে ৮০% সদস্যের সম্মতি গ্রহণ করতে হবে।']
  ];
  defaults.forEach((d, i)=>{
    sheet.appendRow([genId_('R'), i + 1, d[0], d[1], 'প্রতিষ্ঠাকালীন নিয়ম', now]);
  });
  const dateCol = HEADERS[SHEETS.RULES].indexOf('তারিখ') + 1;
  for(let r = 2; r <= sheet.getLastRow(); r++){
    formatDateTimeCell_(sheet, r, dateCol);
  }
}

function sheetToObjects_(sheet){
  const data = sheet.getDataRange().getValues();
  if(data.length < 2) return [];
  const headers = data[0];
  const tz = Session.getScriptTimeZone();
  return data.slice(1)
    .filter(row => row.join('') !== '')
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        let v = row[i];
        if(v instanceof Date){
          v = Utilities.formatDate(v, tz, "yyyy-MM-dd'T'HH:mm:ss");
        }
        obj[h] = v;
      });
      return obj;
    });
}

function findRowIndexById_(sheet, id){
  const data = sheet.getDataRange().getValues();
  for(let i = 1; i < data.length; i++){
    if(String(data[i][0]) === String(id)) return i + 1; // 1-based sheet row
  }
  return -1;
}

function genId_(prefix){
  return prefix + Utilities.getUuid().split('-')[0];
}

function jsonOut_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function nowIso_(){
  // আসল Date অবজেক্ট রিটার্ন করে, যাতে শিটে সেভ হওয়ার সময় এটা প্লেইন টেক্সট
  // ("2026-07-01T00:00:00") না হয়ে একটা স্বাভাবিক তারিখ-সময় ভ্যালু হিসেবে বসে।
  return new Date();
}

const DATETIME_FORMAT_ = 'M/d/yyyy h:mm AM/PM';

/* যে সেলে সময়সহ তারিখ (Date অবজেক্ট) বসানো হয়েছে, সেটাকে
   AM/PM ফরম্যাটে স্বাভাবিকভাবে দেখানোর জন্য নাম্বার ফরম্যাট সেট করে */
function formatDateTimeCell_(sheet, row, col){
  sheet.getRange(row, col).setNumberFormat(DATETIME_FORMAT_);
}

/* ---------------- password hashing (SHA-256, phone-salted) ----------------
   দ্রষ্টব্য: এটা কমিউনিটি-স্তরের নিরাপত্তা, ব্যাংকিং-গ্রেড এনক্রিপশন নয়।
   Web App ডিপ্লয় করার সময় "Who has access: Anyone" ছাড়া অন্য কাউকে
   এই স্প্রেডশিট এডিট এক্সেস দেবেন না। */
function hashPassword_(password, salt){
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + '::বন্ধু_ঐক্য::' + salt,
    Utilities.Charset.UTF_8
  );
  return bytes.map(b => ((b < 0 ? b + 256 : b).toString(16)).padStart(2, '0')).join('');
}

/* ---------------- entry points ---------------- */
function doGet(e){
  try{
    ensureAllSheets_();
    const sheetName = e.parameter.sheet;
    if(!sheetName) return jsonOut_({status:'error', message:'sheet প্যারামিটার আবশ্যক'});
    if(!HEADERS[sheetName]) return jsonOut_({status:'error', message:'অজানা শিট: ' + sheetName});
    const sheet = getSheet_(sheetName);
    let rows = sheetToObjects_(sheet);
    if(sheetName === SHEETS.USERS){
      rows = rows.map(r => { const c = Object.assign({}, r); delete c['পাসওয়ার্ড_হ্যাশ']; return c; });
    }
    return jsonOut_({status:'ok', data: rows});
  }catch(err){
    return jsonOut_({status:'error', message:String(err)});
  }
}

function doPost(e){
  try{
    ensureAllSheets_();
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    switch(action){
      case 'register':            return jsonOut_(registerUser_(body.data));
      case 'login':                return jsonOut_(loginUser_(body.data));
      case 'approveUser':          return jsonOut_(setUserStatus_(body.id, 'অনুমোদিত', body.actorRole));
      case 'rejectUser':           return jsonOut_(setUserStatus_(body.id, 'বাতিল', body.actorRole));
      case 'changeRole':           return jsonOut_(changeUserRole_(body.id, body.data && body.data['রোল'], body.actorRole));
      case 'submitContribution':   return jsonOut_(submitContribution_(body.data));
      case 'verifyContribution':   return jsonOut_(verifyContribution_(body.id, body.data && body.data['যাচাইকারী'], body.actorRole));
      case 'rejectContribution':   return jsonOut_(rejectContribution_(body.id, body.data && body.data['যাচাইকারী'], body.actorRole));
      case 'vote':                 return jsonOut_(castVote_(body.data));
      case 'closePoll':            return jsonOut_(closePoll_(body.id, body.actorRole));
      case 'add':                  return jsonOut_(addRow_(body.sheet, body.data, body.actorRole));
      case 'addInvestment':         return jsonOut_(addInvestment_(body.data, body.actorRole));
      case 'addInstallment':        return jsonOut_(addInstallment_(body.data, body.actorRole));
      case 'edit':                 return jsonOut_(editRow_(body.sheet, body.id, body.data, body.actorRole));
      case 'delete':               return jsonOut_(deleteRow_(body.sheet, body.id, body.actorRole));
      case 'uploadImage':          return jsonOut_(uploadInvestmentImage_(body.data, body.actorRole));
      case 'submitTransaction':    return jsonOut_(submitTransaction_(body.data, body.actorRole));
      case 'verifyTransaction':    return jsonOut_(verifyTransaction_(body.id, body.data && body.data['যাচাইকারী'], body.actorRole));
      case 'rejectTransaction':    return jsonOut_(rejectTransaction_(body.id, body.data && body.data['যাচাইকারী'], body.data && body.data['বাতিলের_কারণ'], body.actorRole));
      case 'reviseTransaction':    return jsonOut_(reviseTransaction_(body.id, body.data, body.actorRole));
      case 'deleteTransaction':    return jsonOut_(deleteTransaction_(body.id, body.actorRole));
      default:                     return jsonOut_({status:'error', message:'অজানা action: ' + action});
    }
  }catch(err){
    return jsonOut_({status:'error', message:String(err)});
  }
}

/* ---------------- auth ---------------- */
function registerUser_(data){
  data = data || {};
  const username = (data['ইউজারনেম'] || '').toString().trim();
  const name = (data['নাম'] || '').toString().trim();
  const phone = (data['ফোন'] || '').toString().trim();
  const password = (data['পাসওয়ার্ড'] || '').toString();
  if(!username || !name || !phone || !password){
    return {status:'error', message:'ইউজারনেম, নাম, ফোন ও পাসওয়ার্ড আবশ্যক'};
  }
  const sheet = getSheet_(SHEETS.USERS);
  const rows = sheetToObjects_(sheet);
  if(rows.some(r => String(r['ইউজারনেম']).toLowerCase() === username.toLowerCase())){
    return {status:'error', message:'এই ইউজারনেম আগে থেকেই ব্যবহৃত হয়েছে'};
  }
  if(rows.some(r => String(r['ফোন']) === phone)){
    return {status:'error', message:'এই ফোন নম্বর দিয়ে আগে থেকেই অ্যাকাউন্ট আছে'};
  }
  const id = genId_('U');
  const hash = hashPassword_(password, username.toLowerCase());
  sheet.appendRow([id, username, name, phone, hash, MEMBER, 'পেন্ডিং', nowIso_()]);
  formatDateTimeCell_(sheet, sheet.getLastRow(), HEADERS[SHEETS.USERS].indexOf('যোগদানের_তারিখ') + 1);
  return {status:'ok', message:'আবেদন জমা হয়েছে। ম্যানেজারের অনুমোদনের পর লগইন করতে পারবেন।', id: id};
}

function loginUser_(data){
  data = data || {};
  const username = (data['ইউজারনেম'] || '').toString().trim();
  const password = (data['পাসওয়ার্ড'] || '').toString();
  if(!username || !password) return {status:'error', message:'ইউজারনেম ও পাসওয়ার্ড দিন'};
  const sheet = getSheet_(SHEETS.USERS);
  const rows = sheetToObjects_(sheet);
  const user = rows.find(r => String(r['ইউজারনেম']).toLowerCase() === username.toLowerCase());
  if(!user) return {status:'error', message:'এই ইউজারনেমে কোনো অ্যাকাউন্ট নেই'};
  if(user['স্ট্যাটাস'] === 'পেন্ডিং') return {status:'error', message:'আপনার আবেদন এখনো ম্যানেজারের অনুমোদনের অপেক্ষায়'};
  if(user['স্ট্যাটাস'] === 'বাতিল') return {status:'error', message:'আপনার আবেদন বাতিল করা হয়েছে'};
  const hash = hashPassword_(password, String(user['ইউজারনেম']).toLowerCase());
  if(hash !== user['পাসওয়ার্ড_হ্যাশ']) return {status:'error', message:'ইউজারনেম বা পাসওয়ার্ড ভুল'};
  const safeUser = Object.assign({}, user);
  delete safeUser['পাসওয়ার্ড_হ্যাশ'];
  return {status:'ok', data: safeUser};
}

function requireManager_(actorRole){
  return actorRole === MANAGER;
}

function setUserStatus_(id, status, actorRole){
  if(!requireManager_(actorRole)) return {status:'error', message:'শুধু ম্যানেজার এই কাজ করতে পারবেন'};
  const sheet = getSheet_(SHEETS.USERS);
  const rowIdx = findRowIndexById_(sheet, id);
  if(rowIdx === -1) return {status:'error', message:'ইউজার পাওয়া যায়নি'};
  const col = HEADERS[SHEETS.USERS].indexOf('স্ট্যাটাস') + 1;
  sheet.getRange(rowIdx, col).setValue(status);
  return {status:'ok', message:'স্ট্যাটাস আপডেট হয়েছে'};
}

function changeUserRole_(id, role, actorRole){
  if(!requireManager_(actorRole)) return {status:'error', message:'শুধু ম্যানেজার এই কাজ করতে পারবেন'};
  if(![MANAGER, CASHIER, FIELD_DIRECTOR, MEMBER].includes(role)){
    return {status:'error', message:'অবৈধ রোল'};
  }
  const sheet = getSheet_(SHEETS.USERS);
  const rowIdx = findRowIndexById_(sheet, id);
  if(rowIdx === -1) return {status:'error', message:'ইউজার পাওয়া যায়নি'};
  const col = HEADERS[SHEETS.USERS].indexOf('রোল') + 1;
  sheet.getRange(rowIdx, col).setValue(role);
  return {status:'ok', message:'রোল পরিবর্তন হয়েছে'};
}

/* ---------------- contributions (চাঁদা) ---------------- */
function submitContribution_(data){
  data = data || {};
  const required = ['সদস্য_ID','সদস্যের_নাম','মাস','পরিমাণ'];
  for(const k of required){ if(!data[k] && data[k] !== 0) return {status:'error', message:'সব তথ্য পূরণ করুন'}; }
  const sheet = getSheet_(SHEETS.CONTRIB);
  const id = genId_('C');
  sheet.appendRow([
    id, data['সদস্য_ID'], data['সদস্যের_নাম'], data['মাস'], data['পরিমাণ'],
    data['মাধ্যম'] || '', data['ট্রানজেকশন_আইডি'] || '', 'পেন্ডিং', nowIso_(), '', ''
  ]);
  formatDateTimeCell_(sheet, sheet.getLastRow(), HEADERS[SHEETS.CONTRIB].indexOf('জমার_তারিখ') + 1);
  return {status:'ok', message:'চাঁদা জমার রিকুয়েস্ট পাঠানো হয়েছে', id: id};
}

function verifyContribution_(id, verifier, actorRole){
  if(actorRole !== CASHIER && actorRole !== MANAGER){
    return {status:'error', message:'শুধু ক্যাশিয়ার বা ম্যানেজার যাচাই করতে পারবেন'};
  }
  const sheet = getSheet_(SHEETS.CONTRIB);
  const rowIdx = findRowIndexById_(sheet, id);
  if(rowIdx === -1) return {status:'error', message:'এন্ট্রি পাওয়া যায়নি'};
  const headers = HEADERS[SHEETS.CONTRIB];
  sheet.getRange(rowIdx, headers.indexOf('স্ট্যাটাস') + 1).setValue('ভেরিফাইড');
  sheet.getRange(rowIdx, headers.indexOf('যাচাইকারী') + 1).setValue(verifier || '');
  const verifyCol = headers.indexOf('যাচাইয়ের_তারিখ') + 1;
  sheet.getRange(rowIdx, verifyCol).setValue(nowIso_());
  formatDateTimeCell_(sheet, rowIdx, verifyCol);
  return {status:'ok', message:'যাচাই সম্পন্ন হয়েছে'};
}

function rejectContribution_(id, verifier, actorRole){
  if(actorRole !== CASHIER && actorRole !== MANAGER){
    return {status:'error', message:'শুধু ক্যাশিয়ার বা ম্যানেজার বাতিল করতে পারবেন'};
  }
  const sheet = getSheet_(SHEETS.CONTRIB);
  const rowIdx = findRowIndexById_(sheet, id);
  if(rowIdx === -1) return {status:'error', message:'এন্ট্রি পাওয়া যায়নি'};
  const headers = HEADERS[SHEETS.CONTRIB];
  sheet.getRange(rowIdx, headers.indexOf('স্ট্যাটাস') + 1).setValue('বাতিল');
  sheet.getRange(rowIdx, headers.indexOf('যাচাইকারী') + 1).setValue(verifier || '');
  const verifyCol = headers.indexOf('যাচাইয়ের_তারিখ') + 1;
  sheet.getRange(rowIdx, verifyCol).setValue(nowIso_());
  formatDateTimeCell_(sheet, rowIdx, verifyCol);
  return {status:'ok', message:'রিকুয়েস্ট বাতিল করা হয়েছে'};
}

/* ---------------- polls (ভোট) ---------------- */
function castVote_(data){
  data = data || {};
  const pollId = data['ভোট_ID'], memberId = data['সদস্য_ID'], choice = data['বাছাই'];
  if(!pollId || !memberId || !choice) return {status:'error', message:'সব তথ্য দরকার'};
  const pollSheet = getSheet_(SHEETS.POLL);
  const pollRowIdx = findRowIndexById_(pollSheet, pollId);
  if(pollRowIdx === -1) return {status:'error', message:'ভোট পাওয়া যায়নি'};
  const pollHeaders = HEADERS[SHEETS.POLL];
  const status = pollSheet.getRange(pollRowIdx, pollHeaders.indexOf('স্ট্যাটাস') + 1).getValue();
  if(status !== 'চলমান') return {status:'error', message:'এই ভোট এখন বন্ধ আছে'};
  const votesSheet = getSheet_(SHEETS.VOTES);
  const existing = sheetToObjects_(votesSheet);
  if(existing.some(v => String(v['ভোট_ID']) === String(pollId) && String(v['সদস্য_ID']) === String(memberId))){
    return {status:'error', message:'আপনি ইতিমধ্যে এই ভোটে অংশ নিয়েছেন'};
  }
  const id = genId_('V');
  votesSheet.appendRow([id, pollId, memberId, choice, nowIso_()]);
  formatDateTimeCell_(votesSheet, votesSheet.getLastRow(), HEADERS[SHEETS.VOTES].indexOf('তারিখ') + 1);
  return {status:'ok', message:'ভোট গ্রহণ করা হয়েছে'};
}

function closePoll_(id, actorRole){
  if(!requireManager_(actorRole)) return {status:'error', message:'শুধু ম্যানেজার ভোট বন্ধ করতে পারবেন'};
  const sheet = getSheet_(SHEETS.POLL);
  const rowIdx = findRowIndexById_(sheet, id);
  if(rowIdx === -1) return {status:'error', message:'ভোট পাওয়া যায়নি'};
  sheet.getRange(rowIdx, HEADERS[SHEETS.POLL].indexOf('স্ট্যাটাস') + 1).setValue('বন্ধ');
  return {status:'ok', message:'ভোট বন্ধ করা হয়েছে'};
}

/* ---------------- generic add/edit/delete (ইনভেস্টমেন্ট, খরচ, নোটিশ, ভোট তৈরি, নিয়মাবলী) ---------------- */
const ROLE_GUARD = {
  'ইনভেস্টমেন্ট': [MANAGER, FIELD_DIRECTOR],
  'ইনভেস্টমেন্ট_কিস্তি': [MANAGER, FIELD_DIRECTOR, CASHIER],
  /* বাচ্চা যুক্ত করা, আদালকে দেওয়া, বিক্রি করা — এসব ম্যানেজার/ফিল্ড পরিচালকের
     কাজ। কিন্তু 'বাচ্চা_আপডেট' (শুধু ছবি/নোট) ইচ্ছাকৃতভাবে এখানে নেই — যেকোনো
     লগইনকৃত সদস্য একটা বাচ্চার সাম্প্রতিক অবস্থার ছবি/নোট দিতে পারবে, ঠিক
     'ইনভেস্টমেন্ট_আপডেট'-এর মতোই। */
  'আদাল':         [MANAGER, FIELD_DIRECTOR],
  'বাচ্চা':       [MANAGER, FIELD_DIRECTOR],
  'খরচ':          [MANAGER, CASHIER],
  'নোটিশ':        [MANAGER],
  'ভোট':          [MANAGER],
  /* নিয়মাবলী (সংগঠনের গঠনতন্ত্র) — যোগ করা ও মুছে ফেলা শুধু ম্যানেজারের কাজ।
     দেখা (doGet) সবার জন্য উন্মুক্ত, কারণ doGet-এ কোনো রোল-গার্ড নেই — এই
     গার্ডটা শুধু 'add' / 'edit' / 'delete' একশনে প্রযোজ্য। */
  'নিয়মাবলী':    [MANAGER]
};

function checkGuard_(sheetName, actorRole){
  const allowed = ROLE_GUARD[sheetName];
  if(!allowed) return true; // no guard defined for this sheet
  return allowed.indexOf(actorRole) !== -1;
}

/* ---------------- ইনভেস্টমেন্টের প্রমাণ ছবি আপলোড ----------------
   ফ্রন্টএন্ড থেকে base64 ছবি পাঠানো হয়, এখানে সেটা সমিতির নিজের Google
   Drive-এ সেভ করে এবং সবার জন্য "anyone with the link" ভিউ-এক্সেস দিয়ে
   সরাসরি-দেখার-উপযোগী একটা লিংক রিটার্ন করে, যেটা 'প্রমাণ_লিংক' কলামে
   সেভ হবে। কোনো তৃতীয়-পক্ষের সাইটের উপর নির্ভর করতে হয় না — ছবি
   সবসময় আপনার নিজের অ্যাকাউন্টের Drive-এই থাকে। */
function getProofFolder_(){
  const FOLDER_NAME = 'বন্ধু ঐক্য - ইনভেস্টমেন্ট প্রমাণ';
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  if(it.hasNext()) return it.next();
  return DriveApp.createFolder(FOLDER_NAME);
}

function uploadInvestmentImage_(data, actorRole){
  if([MANAGER, CASHIER, FIELD_DIRECTOR, MEMBER].indexOf(actorRole) === -1){
    return {status:'error', message:'এই কাজের অনুমতি নেই'};
  }
  data = data || {};
  const base64 = data.base64;
  if(!base64) return {status:'error', message:'কোনো ছবি পাওয়া যায়নি'};
  const mimeType = data.mimeType || 'image/jpeg';
  const filename = data.filename || ('proof_' + new Date().getTime() + '.jpg');
  try{
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, mimeType, filename);
    const folder = getProofFolder_();
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const url = 'https://drive.google.com/uc?export=view&id=' + file.getId();
    return {status:'ok', message:'ছবি আপলোড হয়েছে', data:{url: url}};
  }catch(err){
    return {status:'error', message:'ছবি আপলোড ব্যর্থ: ' + String(err)};
  }
}

/* কোনো প্যারেন্ট শিটের একটা রো-এর 'সর্বশেষ_আপডেট' কলাম এখনকার সময়ে সেট করে —
   এতে সাব-এন্ট্রি (যেমন: তথ্য/ছবি আপডেট, কিস্তি জমা) যোগ হলেই প্যারেন্ট
   এন্ট্রিটা তালিকার উপরের দিকে চলে আসে, ফলে তালিকা সবসময় সর্বশেষ
   কার্যক্রম অনুযায়ী সাজানো থাকে (এলোমেলো দেখায় না)। */
function touchRowTimestamp_(sheetName, id){
  if(!id) return;
  const sheet = getSheet_(sheetName);
  const rowIdx = findRowIndexById_(sheet, id);
  if(rowIdx === -1) return;
  const headers = HEADERS[sheetName];
  const col = headers.indexOf('সর্বশেষ_আপডেট') + 1;
  if(col <= 0) return;
  sheet.getRange(rowIdx, col).setValue(nowIso_());
  formatDateTimeCell_(sheet, rowIdx, col);
}

function addRow_(sheetName, data, actorRole){
  if(!HEADERS[sheetName]) return {status:'error', message:'অজানা শিট'};
  if(!checkGuard_(sheetName, actorRole)) return {status:'error', message:'এই কাজের অনুমতি নেই'};
  const sheet = getSheet_(sheetName);
  const headers = HEADERS[sheetName];
  const id = genId_(sheetName[0]);
  const row = headers.map(h => {
    if(h === 'ID') return id;
    if(h === 'সর্বশেষ_আপডেট' || h === 'তারিখ' || h === 'শুরুর_তারিখ') return (data && data[h]) || nowIso_();
    return (data && data[h] !== undefined) ? data[h] : '';
  });
  sheet.appendRow(row);
  const lastRow = sheet.getLastRow();
  row.forEach((v, i) => { if(v instanceof Date) formatDateTimeCell_(sheet, lastRow, i + 1); });
  // কোনো সদস্য একটা ইনভেস্টমেন্টে (বা বাচ্চায়) নতুন তথ্য/ছবি যোগ করলে, সেই
  // প্যারেন্ট এন্ট্রিটাকেই "সর্বশেষ হালনাগাদ" ধরে তালিকার উপরে তুলে আনা হয়
  if(sheetName === SHEETS.INVEST_UPDATE && data){
    touchRowTimestamp_(SHEETS.INVEST, data['ইনভেস্টমেন্ট_ID']);
  }
  if(sheetName === SHEETS.BABY_UPDATE && data){
    touchRowTimestamp_(SHEETS.BABY, data['বাচ্চা_ID']);
  }
  return {status:'ok', message:'যোগ করা হয়েছে', id: id};
}

/* ---------------- নতুন ইনভেস্টমেন্ট যোগ করা ----------------
   সাধারণ ইনভেস্টমেন্ট (গরু/ছাগল/শেয়ার ব্যবসা/অন্যান্য) এবং "বাকি বিক্রয়
   (মুরাবাহা)" — দুটোই একই ইনভেস্টমেন্ট শিটে থাকে, ধরন অনুযায়ী আলাদা
   আলাদা ফিল্ড ব্যবহার হয়। মুরাবাহা পদ্ধতিতে সমিতি পণ্য ক্রয় করে
   গ্রাহকের কাছে অগ্রিম-ঘোষিত লাভে বিক্রি করে (কোনো সুদ নেই — শুধু
   ক্রয়মূল্যের সাথে ঘোষিত লাভ যোগ করে একটাই নির্দিষ্ট বিক্রয়মূল্য ঠিক
   হয়, যা কয়েক কিস্তিতে আদায় হয়)। */
function addInvestment_(data, actorRole){
  if(!checkGuard_(SHEETS.INVEST, actorRole)) return {status:'error', message:'এই কাজের অনুমতি নেই'};
  data = data || {};
  const title = (data['শিরোনাম'] || '').toString().trim();
  const type = (data['ধরন'] || '').toString().trim();
  const amt = Number(data['বিনিয়োগ_টাকা'] || 0);
  if(!title || !type || !amt){
    return {status:'error', message:'শিরোনাম, ধরন ও বিনিয়োগের পরিমাণ আবশ্যক'};
  }
  const sheet = getSheet_(SHEETS.INVEST);
  const headers = HEADERS[SHEETS.INVEST];
  const id = genId_('I');
  const now = nowIso_();
  const isSale = type === SALE_TYPE;

  let currentValue, profit, salePrice, custName, custPhone, custAddr, totalInst, paidInst, paidAmt, dueAmt;
  if(isSale){
    salePrice = Number(data['বিক্রয়মূল্য'] || 0);
    custName = (data['গ্রাহকের_নাম'] || '').toString().trim();
    if(!salePrice || !custName){
      return {status:'error', message:'বাকি বিক্রয়ের জন্য বিক্রয়মূল্য ও গ্রাহকের নাম আবশ্যক'};
    }
    if(salePrice < amt){
      return {status:'error', message:'বিক্রয়মূল্য ক্রয়মূল্যের (বিনিয়োগ) চেয়ে কম হতে পারে না'};
    }
    currentValue = salePrice;
    profit = salePrice - amt;
    custPhone = data['গ্রাহকের_ফোন'] || '';
    custAddr = data['গ্রাহকের_ঠিকানা'] || '';
    totalInst = Math.max(1, Number(data['মোট_কিস্তি'] || 1));
    paidInst = 0; paidAmt = 0; dueAmt = salePrice;
  } else {
    currentValue = Number(data['বর্তমান_মূল্য'] || amt);
    profit = currentValue - amt;
    salePrice = ''; custName = ''; custPhone = ''; custAddr = '';
    totalInst = ''; paidInst = ''; paidAmt = ''; dueAmt = '';
  }

  const row = headers.map(h=>{
    switch(h){
      case 'ID': return id;
      case 'শিরোনাম': return title;
      case 'ধরন': return type;
      case 'বিনিয়োগ_টাকা': return amt;
      case 'বর্তমান_মূল্য': return currentValue;
      case 'লাভ_ক্ষতি': return profit;
      case 'অবস্থা': return 'চলমান';
      case 'শুরুর_তারিখ': return data['শুরুর_তারিখ'] || now;
      case 'পরিচালক': return data['পরিচালক'] || '';
      case 'প্রমাণ_লিংক': return data['প্রমাণ_লিংক'] || '';
      case 'বিবরণ': return data['বিবরণ'] || '';
      case 'সর্বশেষ_আপডেট': return now;
      case 'বিক্রয়মূল্য': return salePrice;
      case 'গ্রাহকের_নাম': return custName;
      case 'গ্রাহকের_ফোন': return custPhone;
      case 'গ্রাহকের_ঠিকানা': return custAddr;
      case 'মোট_কিস্তি': return totalInst;
      case 'পরিশোধিত_কিস্তি': return paidInst;
      case 'পরিশোধিত_টাকা': return paidAmt;
      case 'বাকি_টাকা': return dueAmt;
      default: return '';
    }
  });
  sheet.appendRow(row);
  const lastRow = sheet.getLastRow();
  row.forEach((v,i)=>{ if(v instanceof Date) formatDateTimeCell_(sheet, lastRow, i+1); });
  return {status:'ok', message:'ইনভেস্টমেন্ট যোগ হয়েছে', id: id};
}

/* গ্রাহকের কাছ থেকে বাকি বিক্রয়ের একটা কিস্তি আদায় হলে এটা কল হয় — কিস্তির
   রেকর্ড যোগ করার পাশাপাশি প্যারেন্ট ইনভেস্টমেন্ট এন্ট্রির পরিশোধিত/বাকি
   হিসাব ও অবস্থা (চলমান/পরিশোধিত) স্বয়ংক্রিয়ভাবে আপডেট করে দেয়। */
function addInstallment_(data, actorRole){
  if(!checkGuard_(SHEETS.INVEST_INSTALLMENT, actorRole)) return {status:'error', message:'এই কাজের অনুমতি নেই'};
  data = data || {};
  const investId = data['ইনভেস্টমেন্ট_ID'];
  const amount = Number(data['পরিমাণ'] || 0);
  if(!investId || (!amount && amount !== 0) || amount < 0) return {status:'error', message:'ইনভেস্টমেন্ট ও কিস্তির পরিমাণ আবশ্যক'};
  const invSheet = getSheet_(SHEETS.INVEST);
  const invRowIdx = findRowIndexById_(invSheet, investId);
  if(invRowIdx === -1) return {status:'error', message:'ইনভেস্টমেন্ট এন্ট্রি পাওয়া যায়নি'};
  const invHeaders = HEADERS[SHEETS.INVEST];
  const invRowVals = invSheet.getRange(invRowIdx, 1, 1, invHeaders.length).getValues()[0];
  const get = h => invRowVals[invHeaders.indexOf(h)];
  if(get('ধরন') !== SALE_TYPE) return {status:'error', message:'এটা বাকি বিক্রয় এন্ট্রি নয়'};
  const dueBefore = Number(get('বাকি_টাকা') || 0);
  if(amount > dueBefore){
    return {status:'error', message:'কিস্তির পরিমাণ বাকি টাকার চেয়ে বেশি হতে পারে না (বাকি: ৳' + dueBefore + ')'};
  }
  // কিস্তির রেকর্ড
  const instSheet = getSheet_(SHEETS.INVEST_INSTALLMENT);
  const instId = genId_('K');
  const instHeaders = HEADERS[SHEETS.INVEST_INSTALLMENT];
  const instNo = Number(get('পরিশোধিত_কিস্তি') || 0) + 1;
  const now = nowIso_();
  instSheet.appendRow([
    instId, investId, instNo, amount, data['মাধ্যম'] || '', data['আদায়কারী'] || '', now
  ]);
  formatDateTimeCell_(instSheet, instSheet.getLastRow(), instHeaders.indexOf('তারিখ') + 1);
  // প্যারেন্ট ইনভেস্টমেন্টের হিসাব হালনাগাদ
  const paidTotal = Number(get('পরিশোধিত_টাকা') || 0) + amount;
  const dueAfter = dueBefore - amount;
  const status = dueAfter <= 0 ? 'পরিশোধিত' : 'চলমান';
  invSheet.getRange(invRowIdx, invHeaders.indexOf('পরিশোধিত_কিস্তি') + 1).setValue(instNo);
  invSheet.getRange(invRowIdx, invHeaders.indexOf('পরিশোধিত_টাকা') + 1).setValue(paidTotal);
  invSheet.getRange(invRowIdx, invHeaders.indexOf('বাকি_টাকা') + 1).setValue(Math.max(0, dueAfter));
  invSheet.getRange(invRowIdx, invHeaders.indexOf('অবস্থা') + 1).setValue(status);
  const updCol = invHeaders.indexOf('সর্বশেষ_আপডেট') + 1;
  invSheet.getRange(invRowIdx, updCol).setValue(now);
  formatDateTimeCell_(invSheet, invRowIdx, updCol);
  return {status:'ok', message: status==='পরিশোধিত' ? 'শেষ কিস্তি জমা হয়েছে, সম্পূর্ণ পরিশোধিত' : 'কিস্তি জমা হয়েছে', id: instId};
}

function editRow_(sheetName, id, data, actorRole){
  if(!HEADERS[sheetName]) return {status:'error', message:'অজানা শিট'};
  if(!checkGuard_(sheetName, actorRole)) return {status:'error', message:'এই কাজের অনুমতি নেই'};
  const sheet = getSheet_(sheetName);
  const rowIdx = findRowIndexById_(sheet, id);
  if(rowIdx === -1) return {status:'error', message:'এন্ট্রি পাওয়া যায়নি'};
  const headers = HEADERS[sheetName];
  Object.keys(data || {}).forEach(key => {
    const col = headers.indexOf(key);
    if(col !== -1) sheet.getRange(rowIdx, col + 1).setValue(data[key]);
  });
  if(headers.indexOf('সর্বশেষ_আপডেট') !== -1){
    const updCol = headers.indexOf('সর্বশেষ_আপডেট') + 1;
    sheet.getRange(rowIdx, updCol).setValue(nowIso_());
    formatDateTimeCell_(sheet, rowIdx, updCol);
  }
  return {status:'ok', message:'আপডেট হয়েছে'};
}

function deleteRow_(sheetName, id, actorRole){
  if(!HEADERS[sheetName]) return {status:'error', message:'অজানা শিট'};
  if(!checkGuard_(sheetName, actorRole)) return {status:'error', message:'এই কাজের অনুমতি নেই'};
  const sheet = getSheet_(sheetName);
  const rowIdx = findRowIndexById_(sheet, id);
  if(rowIdx === -1) return {status:'error', message:'এন্ট্রি পাওয়া যায়নি'};
  sheet.deleteRow(rowIdx);
  return {status:'ok', message:'মুছে ফেলা হয়েছে'};
}

/* ==================== লেনদেন (ফিল্ড পরিচালক/ম্যানেজার → ক্যাশিয়ার যাচাই) ====================
   নীতি: ফিল্ড পরিচালক বা ম্যানেজার নিজের কাছে কোনো টাকা রাখতে পারবেন না।
   কোনো খাতেই (চাঁদা আদায়, কিস্তি আদায়, বিক্রয়মূল্য, বা অন্য যেকোনো নগদ
   প্রাপ্তি) টাকা হাতে পেলে তা এখানে বিস্তারিত বিবরণসহ সাবমিট করতে হবে।
   ক্যাশিয়ার (বা ম্যানেজার) যাচাই করলেই সেটা কার্যকর/হিসাবভুক্ত ধরা হবে।

   অবস্থা-চক্র:
   পেন্ডিং --(ক্যাশিয়ার যাচাই)--> ভেরিফাইড  [চূড়ান্ত]
   পেন্ডিং --(ক্যাশিয়ার বাতিল + কারণ)--> বাতিল --(সাবমিটকারী "সংশোধন")--> পেন্ডিং (আবার)
                                        বাতিল --(সাবমিটকারী "মুছে ফেলুন")--> [রো একেবারে ডিলিট, যেন কখনো হয়ইনি] */

function submitTransaction_(data, actorRole){
  if([FIELD_DIRECTOR, MANAGER].indexOf(actorRole) === -1){
    return {status:'error', message:'শুধু ফিল্ড পরিচালক বা ম্যানেজার লেনদেন সাবমিট করতে পারবেন'};
  }
  data = data || {};
  const category = (data['ধরন'] || '').toString().trim();
  const amount = Number(data['পরিমাণ']);
  const desc = (data['বিবরণ'] || '').toString().trim();
  const submitterId = data['সাবমিটকারী_ID'];
  const submitterName = (data['সাবমিটকারীর_নাম'] || '').toString().trim();
  const submitterRole = (data['সাবমিটকারীর_পদ'] || actorRole).toString().trim();
  // দ্রষ্টব্য: `!amount` দিয়ে চেক করলে amount = 0 কেও "খালি" ধরে ভুলভাবে
  // রিজেক্ট করে দিত (JS-এ 0 falsy)। তাই এখন সংখ্যাটা বৈধ কিনা (NaN নয়) ও
  // ঋণাত্মক নয় কিনা তা আলাদাভাবে যাচাই করা হচ্ছে, যাতে ০ (শূন্য) টাকার
  // এন্ট্রিও গ্রহণযোগ্য হয়।
  if(!category || isNaN(amount) || amount < 0 || !desc || !submitterId || !submitterName){
    return {status:'error', message:'ধরন, পরিমাণ, বিস্তারিত বিবরণ ও সাবমিটকারীর তথ্য আবশ্যক'};
  }
  const sheet = getSheet_(SHEETS.TRANSACTION);
  const id = genId_('T');
  const now = nowIso_();
  sheet.appendRow([
    id, category, data['ইনভেস্টমেন্ট_ID'] || data['সংশ্লিষ্ট_তথ্য'] || '', amount, desc,
    submitterId, submitterName, submitterRole,
    'পেন্ডিং', '', now, '', ''
  ]);
  formatDateTimeCell_(sheet, sheet.getLastRow(), HEADERS[SHEETS.TRANSACTION].indexOf('জমার_তারিখ') + 1);
  return {status:'ok', message:'লেনদেনের আবেদন ক্যাশিয়ারের কাছে ভেরিফিকেশনের জন্য পাঠানো হয়েছে', id: id};
}

/* লেনদেন ভেরিফাই হওয়ার মুহূর্তে টাকাটা আসলে কোথায় যোগ হবে তা এখানে ঠিক হয় —
   ধরন অনুযায়ী সংশ্লিষ্ট ইনভেস্টমেন্ট এন্ট্রি আপডেট হয়। 'হ্যান্ড ক্যাশ' ফর্মুলা
   যেহেতু ইনভেস্টমেন্ট শিটের 'পরিশোধিত_টাকা' কলামের যোগফলের উপর নির্ভর করে
   হিসাব হয়, তাই এখানে আপডেট করলেই হ্যান্ড ক্যাশ নিজে থেকে বেড়ে যাবে। */
function applyVerifiedTransactionEffect_(category, investId, amount, actorRole, submitterName){
  if(category === TXN_TYPE_INSTALLMENT){
    if(!investId) return {status:'error', message:'এই লেনদেনে ইনভেস্টমেন্টের তথ্য নেই, কিস্তি হিসাবে যোগ করা যাচ্ছে না'};
    // কিস্তির রেকর্ড তৈরি + প্যারেন্ট ইনভেস্টমেন্টের পরিশোধিত/বাকি হিসাব —
    // দুটোই addInstallment_ ফাংশনটাই করে দেয়, তাই সেটাই পুনরায় ব্যবহার করা হলো
    return addInstallment_({
      'ইনভেস্টমেন্ট_ID': investId,
      'পরিমাণ': amount,
      'আদায়কারী': submitterName || ''
    }, actorRole);
  }
if(category === TXN_TYPE_INVEST_CASH){
    if(!investId) return {status:'error', message:'এই লেনদেনে ইনভেস্টমেন্টের তথ্য নেই, টাকা যোগ করা যাচ্ছে না'};
    const invSheet = getSheet_(SHEETS.INVEST);
    const invRowIdx = findRowIndexById_(invSheet, investId);
    if(invRowIdx === -1) return {status:'error', message:'সংশ্লিষ্ট ইনভেস্টমেন্ট এন্ট্রি পাওয়া যায়নি'};
    const invHeaders = HEADERS[SHEETS.INVEST];
    const invRowVals = invSheet.getRange(invRowIdx, 1, 1, invHeaders.length).getValues()[0];
    const get = h => invRowVals[invHeaders.indexOf(h)];

const investedAmt = Number(get('বিনিয়োগ_টাকা') || 0);
    const paidBefore  = Number(get('পরিশোধিত_টাকা') || 0);
    const plBefore    = Number(get('লাভ_ক্ষতি') || 0);

    // প্রাপ্ত টাকা বিনিয়োগকৃত টাকার চেয়ে বেশি/কম হলে সেই পার্থক্যটা আগের
    // লাভ/ক্ষতির সাথে যোগ-বিয়োগ হয়ে চূড়ান্ত লাভ/ক্ষতি হিসেবে বসবে
    const profitLoss = plBefore + (amount - investedAmt);

    const paidCol   = invHeaders.indexOf('পরিশোধিত_টাকা') + 1;
    const plCol     = invHeaders.indexOf('লাভ_ক্ষতি') + 1;
    const curValCol = invHeaders.indexOf('বর্তমান_মূল্য') + 1;
    const statusCol = invHeaders.indexOf('অবস্থা') + 1;
    const updCol    = invHeaders.indexOf('সর্বশেষ_আপডেট') + 1;

    invSheet.getRange(invRowIdx, paidCol).setValue(paidBefore + amount);
    invSheet.getRange(invRowIdx, plCol).setValue(profitLoss);
    invSheet.getRange(invRowIdx, curValCol).setValue(0); // টাকা তুলে নেওয়ার পর বর্তমান মূল্য শূন্য
    invSheet.getRange(invRowIdx, statusCol).setValue('সমাপ্ত'); // ইনভেস্টমেন্টটা বন্ধ হয়ে গেল

    const now = nowIso_();
    invSheet.getRange(invRowIdx, updCol).setValue(now);
    formatDateTimeCell_(invSheet, invRowIdx, updCol);

    // হিস্টোরি — ইনভেস্টমেন্ট_আপডেট শিটে একটা নোট আকারে সেভ হবে
    const updSheet = getSheet_(SHEETS.INVEST_UPDATE);
    const noteText = 'ইনভেস্টমেন্ট থেকে প্রাপ্ত টাকা: ৳' + amount +
      ' (বিনিয়োগ ছিল ৳' + investedAmt + ' — ' +
      (profitLoss >= 0 ? 'লাভ' : 'ক্ষতি') + ' ৳' + Math.abs(profitLoss) +
      ') — ইনভেস্টমেন্টটি বন্ধ করা হয়েছে';
    updSheet.appendRow([
      genId_('U'), investId, '', noteText, '', submitterName || '', '', now
    ]);
    formatDateTimeCell_(updSheet, updSheet.getLastRow(), HEADERS[SHEETS.INVEST_UPDATE].indexOf('তারিখ') + 1);

    return {status:'ok'};
  }
  // অন্য কোনো ধরনের লেনদেন হলে নির্দিষ্ট কোনো ইনভেস্টমেন্ট এন্ট্রি নেই,
  // তাই আলাদা করে কিছু আপডেট করার দরকার নেই — টাকাটা শুধু লেনদেন রেকর্ডেই থাকবে
  return {status:'ok'};
}

function verifyTransaction_(id, verifier, actorRole){
  if(actorRole !== CASHIER && actorRole !== MANAGER){
    return {status:'error', message:'শুধু ক্যাশিয়ার বা ম্যানেজার যাচাই করতে পারবেন'};
  }
  const sheet = getSheet_(SHEETS.TRANSACTION);
  const rowIdx = findRowIndexById_(sheet, id);
  if(rowIdx === -1) return {status:'error', message:'লেনদেন পাওয়া যায়নি'};
  const headers = HEADERS[SHEETS.TRANSACTION];
  const rowVals = sheet.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
  const get = h => rowVals[headers.indexOf(h)];
  const status = get('স্ট্যাটাস');
  if(status !== 'পেন্ডিং') return {status:'error', message:'এই লেনদেনটি এখন পেন্ডিং অবস্থায় নেই'};

  // ক্যাশিয়ার যাচাই করার সাথে সাথেই টাকাটা সংশ্লিষ্ট ইনভেস্টমেন্টের হিসাবে যোগ হয়ে যায়
  const effect = applyVerifiedTransactionEffect_(
    get('ধরন'), get('সংশ্লিষ্ট_তথ্য'), Number(get('পরিমাণ') || 0), actorRole, get('সাবমিটকারীর_নাম')
  );
  if(effect && effect.status === 'error') return effect;

  sheet.getRange(rowIdx, headers.indexOf('স্ট্যাটাস') + 1).setValue('ভেরিফাইড');
  sheet.getRange(rowIdx, headers.indexOf('যাচাইকারী') + 1).setValue(verifier || '');
  const verifyCol = headers.indexOf('যাচাইয়ের_তারিখ') + 1;
  sheet.getRange(rowIdx, verifyCol).setValue(nowIso_());
  formatDateTimeCell_(sheet, rowIdx, verifyCol);
  return {status:'ok', message:'লেনদেন ভেরিফাই করা হয়েছে, এটি এখন কার্যকর এবং হ্যান্ড ক্যাশে যোগ হয়ে গেছে'};
}

function rejectTransaction_(id, verifier, reason, actorRole){
  if(actorRole !== CASHIER && actorRole !== MANAGER){
    return {status:'error', message:'শুধু ক্যাশিয়ার বা ম্যানেজার বাতিল করতে পারবেন'};
  }
  reason = (reason || '').toString().trim();
  if(!reason) return {status:'error', message:'বাতিলের কারণ লেখা আবশ্যক'};
  const sheet = getSheet_(SHEETS.TRANSACTION);
  const rowIdx = findRowIndexById_(sheet, id);
  if(rowIdx === -1) return {status:'error', message:'লেনদেন পাওয়া যায়নি'};
  const headers = HEADERS[SHEETS.TRANSACTION];
  const status = sheet.getRange(rowIdx, headers.indexOf('স্ট্যাটাস') + 1).getValue();
  if(status !== 'পেন্ডিং') return {status:'error', message:'এই লেনদেনটি এখন পেন্ডিং অবস্থায় নেই'};
  sheet.getRange(rowIdx, headers.indexOf('স্ট্যাটাস') + 1).setValue('বাতিল');
  sheet.getRange(rowIdx, headers.indexOf('বাতিলের_কারণ') + 1).setValue(reason);
  sheet.getRange(rowIdx, headers.indexOf('যাচাইকারী') + 1).setValue(verifier || '');
  const verifyCol = headers.indexOf('যাচাইয়ের_তারিখ') + 1;
  sheet.getRange(rowIdx, verifyCol).setValue(nowIso_());
  formatDateTimeCell_(sheet, rowIdx, verifyCol);
  return {status:'ok', message:'লেনদেনটি কারণসহ বাতিল করে সাবমিটকারীর কাছে ফেরত পাঠানো হয়েছে'};
}

function reviseTransaction_(id, data, actorRole){
  if([FIELD_DIRECTOR, MANAGER].indexOf(actorRole) === -1){
    return {status:'error', message:'শুধু ফিল্ড পরিচালক বা ম্যানেজার সংশোধন করতে পারবেন'};
  }
  const sheet = getSheet_(SHEETS.TRANSACTION);
  const rowIdx = findRowIndexById_(sheet, id);
  if(rowIdx === -1) return {status:'error', message:'লেনদেন পাওয়া যায়নি'};
  const headers = HEADERS[SHEETS.TRANSACTION];
  const status = sheet.getRange(rowIdx, headers.indexOf('স্ট্যাটাস') + 1).getValue();
  if(status !== 'বাতিল') return {status:'error', message:'শুধু বাতিল হওয়া লেনদেনই সংশোধন করা যাবে'};
  data = data || {};
  ['ধরন','পরিমাণ','বিবরণ','সংশ্লিষ্ট_তথ্য'].forEach(key=>{
    if(data[key] !== undefined){
      const col = headers.indexOf(key);
      if(col !== -1) sheet.getRange(rowIdx, col + 1).setValue(data[key]);
    }
  });
  // সংশোধন করে আবার পাঠানো মানেই আবার নতুন করে পেন্ডিং হয়ে ক্যাশিয়ারের সারিতে যাওয়া;
  // আগের বাতিলের কারণ ও যাচাইকারীর তথ্য মুছে ফেলা হয় যাতে পুরনো তথ্য বিভ্রান্তি না তৈরি করে
  sheet.getRange(rowIdx, headers.indexOf('স্ট্যাটাস') + 1).setValue('পেন্ডিং');
  sheet.getRange(rowIdx, headers.indexOf('বাতিলের_কারণ') + 1).setValue('');
  sheet.getRange(rowIdx, headers.indexOf('যাচাইকারী') + 1).setValue('');
  sheet.getRange(rowIdx, headers.indexOf('যাচাইয়ের_তারিখ') + 1).setValue('');
  const dCol = headers.indexOf('জমার_তারিখ') + 1;
  sheet.getRange(rowIdx, dCol).setValue(nowIso_());
  formatDateTimeCell_(sheet, rowIdx, dCol);
  return {status:'ok', message:'সংশোধিত আবেদনটি আবার ক্যাশিয়ারের কাছে পাঠানো হয়েছে'};
}

function deleteTransaction_(id, actorRole){
  const sheet = getSheet_(SHEETS.TRANSACTION);
  const rowIdx = findRowIndexById_(sheet, id);
  if(rowIdx === -1) return {status:'error', message:'লেনদেন পাওয়া যায়নি'};
  const headers = HEADERS[SHEETS.TRANSACTION];
  const rowVals = sheet.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
  const get = h => rowVals[headers.indexOf(h)];
  const category = get('ধরন');
  const status = get('স্ট্যাটাস');

  if(category === 'মূল্য হালনাগাদ'){
    // "মূল্য হালনাগাদ" অনুরোধ শুধু ক্যাশিয়ার বা ম্যানেজার অনুমোদন/বাতিল করে
    // সরাসরি মুছে ফেলতে পারবেন — এখানে কোনো ইতিহাস রাখা হয় না, তাই স্ট্যাটাস
    // এখনো "পেন্ডিং" থাকা অবস্থাতেই মুছে ফেলার অনুমতি দেওয়া হচ্ছে
    if(actorRole !== CASHIER && actorRole !== MANAGER){
      return {status:'error', message:'শুধু ক্যাশিয়ার বা ম্যানেজার এই অনুরোধ প্রক্রিয়া করতে পারবেন'};
    }
  } else {
    // অন্য সব ধরনের লেনদেনের ক্ষেত্রে — সাবমিটকারী (ফিল্ড পরিচালক/ম্যানেজার)
    // শুধু তার নিজের বাতিল হওয়া আবেদনই একেবারে মুছে ফেলতে পারবেন
    if([FIELD_DIRECTOR, MANAGER].indexOf(actorRole) === -1){
      return {status:'error', message:'শুধু ফিল্ড পরিচালক বা ম্যানেজার মুছতে পারবেন'};
    }
    if(status !== 'বাতিল') return {status:'error', message:'শুধু বাতিল হওয়া লেনদেনই মুছে ফেলা যাবে'};
  }

  sheet.deleteRow(rowIdx);
  return {status:'ok', message:'আবেদনটি সম্পূর্ণ মুছে ফেলা হয়েছে, যেন এটি কখনো হয়ইনি'};
}

/* ---------------- one-time setup helper ----------------
   Apps Script এডিটরে এই ফাংশনটা একবার ম্যানুয়ালি Run করলে সব শিট তৈরি হয়ে
   যাবে এবং প্রথম ম্যানেজার অ্যাকাউন্ট বানিয়ে দেবে
   (ইউজারনেম: Raihan, পাসওয়ার্ড: Rai1234, নাম: MD. RAIHAN SHEKH) —
   লগইন করেই পাসওয়ার্ড বদলে নিন প্রোফাইল থেকে ভবিষ্যতের ফিচারে,
   বা ম্যানেজার শিটের সেল থেকে সরাসরি তথ্য/হ্যাশ বদলে নিন। */
function setupFirstManager(){
  ensureAllSheets_();
  const sheet = getSheet_(SHEETS.USERS);
  const rows = sheetToObjects_(sheet);
  if(rows.some(r => r['রোল'] === MANAGER)) return; // ম্যানেজার আগে থেকেই আছে
  const username = 'Raihan';
  const name = 'MD. RAIHAN SHEKH';
  const phone = ''; // চাইলে নিজের ফোন নম্বর দিয়ে পূরণ করুন
  const hash = hashPassword_('Rai1234', username.toLowerCase());
  sheet.appendRow([genId_('U'), username, name, phone, hash, MANAGER, 'অনুমোদিত', nowIso_()]);
  formatDateTimeCell_(sheet, sheet.getLastRow(), HEADERS[SHEETS.USERS].indexOf('যোগদানের_তারিখ') + 1);
}

/* ---------------- Drive পারমিশন টেস্ট ----------------
   এই ফাংশনটা Apps Script এডিটরে ম্যানুয়ালি একবার Run করলে Google
   Drive-এর লেখা/write অনুমতি চাইবে (ফোল্ডার/ফাইল বানানোর অনুমতি সহ)।
   "Review permissions" পপআপ আসলে অনুমতি দিয়ে দিন — এরপর ছবি আপলোড
   ফিচার কাজ করবে। */
function testDriveAccess(){
  const folder = DriveApp.createFolder('__বন্ধু_ঐক্য_পারমিশন_টেস্ট__');
  folder.setTrashed(true);
}
