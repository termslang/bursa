var compiled = require('./compiled.js');
var deployed = require('./deployed.js');


var bursalib = require('./bursalib.js');

var web3;// = bursalib.web3;
var acc0;// = bursalib.acc0;
var gasPrice;// = bursalib.gasPrice;
var data;// = bursalib.data;



function toWei(amount) {
  return web3.utils.toWei(amount.toString(), 'ether');
}
function fromWei(amount) {
  return web3.utils.fromWei(amount.toString(), 'ether');
}






// 4. TRADE

// async function balance(account, symbol) {
//   if (token == 0) {
//     return await bursa.methods.fundsOf(account).call({ from: account });
//   }
//
//   var token = await new web3.eth.Contract(compiled.erc20_abi, tokenGive.address, { from: acc0, gasPrice: gasPrice });
//   var b = await token.methods.balanceOf(acc0).call({ from: acc0 });
//   return await token.methods.balanceOf(account).call({ from: account });
// }

async function canTrade(order, factAmountGet, from) {
  // var nameGet = '';
  // var nameGive = '';
  // var tokenGet = 0;
  // var tokenGive = 0;
  // if (order.tokenGet != 0) {
  //   nameGet = await getTokenName(order.tokenGet);
  //   tokenGet = order.tokenGet.options.address;
  // }
  // if (order.tokenGive != 0) {
  //   nameGive = await getTokenName(order.tokenGive);
  //   tokenGive = order.tokenGive.options.address;
  // }
  // var b = await bursa.methods.canTrade(tokenGet, order.amountGet, tokenGive, order.amountGive,
  //   order.block, order.user, factAmountGet).call({ from: from });
  // if (factAmountGet == 0) {
  //   factAmountGet == order.amountGet;
  // }
  // console.log('[' + from.slice(38), '] says:\n -> CAN TRADE', b, '. For trade', factAmountGet, '/', order.amountGet, nameGet, 'for', factAmountGet/order.amountGet*order.amountGive, '/', order.amountGive, nameGive);
  // console.log();
  // return b;
}

async function makeTrade(o, willGet) {
  console.log(o.event);
  var canGive = await bursa.methods.canTrade(o.event.tokenGet, o.event.amountGet, o.event.tokenGive, o.event.amountGive,
    o.event.block, o.event.user, willGet).call({ from: acc0, gas: 1000000 });
  if (canGive == 0) return willGet;

  var canGet = canGive * o.priceOfTokenGet;
  var willGive = willGet / canGet * canGive;
  var restGive = willGive;
  if (willGive > canGive) {
    willGive = canGive;
  }
  restGive -= willGive;

  console.log('can give ' + canGive);
  console.log('can get  ' + canGet);
  console.log('wil get  ' + willGet);
  console.log('wil give ' + willGive);
  console.log('rest     ' + restGive);

  var tx = await bursa.methods.trade(o.event.tokenGet, o.event.amountGet, o.event.tokenGive, o.event.amountGive,
    o.event.block, o.event.user, willGive, 0).send({ from: acc0, gas: 1000000 });
    console.log(tx);

  return restGive;
}



async function matchTrade(symbolGet, amountGet, symbolGive, amountGive) {
  var orders = await bursalib.listPairOrders(symbolGet, symbolGive, 0);
  // if (priceOfTokenGet == 0) {
    var tGive = await bursalib.tokenFromSymbol(symbolGive);

    var o;
    var rest = amountGive * tGive.decimals;
    console.log(rest);
    var i=0;
    while (i < orders.length && rest) {
      o = orders[i];
      // console.log(o);
      rest = await makeTrade(o, rest);
      ++i;
    }
  // }
}




async function matchTrade(tokenGet, amountGet, tokenGive, amountGive) {
  var orders = await bursalib.listPairOrders(tokenGet, tokenGive, 0);
  console.log(orders);
}


async function makeOrder(tokenGet, amountGet, tokenGive, amountGive) {
  if (await bursalib.bursaOffline()) return;

  // check balance
  if (tokenGive.symbol == 'ether') {

  }
  else {
    var token = await new web3.eth.Contract(compiled.erc20_abi, tokenGive.address, { from: acc0, gasPrice: gasPrice });
    var b = await token.methods.balanceOf(acc0).call({ from: acc0 });
    if (b < amountGive * tokenGive.decimals) {
      console.log('Not enough ' + tokenGive.symbol + ': ' + b / tokenGive.decimals);
      return;
    }
  }

  console.log('Making order to get ' + amountGet + ' ' + tokenGet.symbol + ' for ' + amountGive + ' ' + tokenGive.symbol + '..');
  var tx = await bursa.methods.order(tokenGet.address, amountGet * tokenGet.decimals,
  tokenGive.address, amountGive * tokenGive.decimals ).send({ from: acc0 });
  console.log('Order placed (' + fromWei(tx.gasUsed * bursa.options.gasPrice) + ' ether paid)');
}




// CONSOLE
//TODO can't deposit to EtherDelta more than on Bursa

async function parseInput(data) {
  var word = data.split(' ');
  switch (word[0]) {
    case 'h':
    case 'help':
      if (word.length > 1) {
        bursalib.showHelp(word[1]);
      } else bursalib.showHelp(0);
    break;

// 1.
    case 't':
    case 'token':
    case 'tokens':
      if (word.length > 2) {
        await bursalib.addToken(word[1], word[2]);
      }
      else {
        await bursalib.showTokens();
      }
      return;
    break;

    case 'a':
    case 'approve':
      if (word.length > 2) {
        await bursalib.approveBursa(word[1], parseFloat(word[2]));
      }
      else if (word.length == 2) {
        await bursalib.approveBursa(word[1], 0);
      }
      else {
        await bursalib.showBalance();
        return;
      }
    break;

// 2.
    case 'l':
    case 'ls':
    case 'list':
      if (word.length > 2) {
        if (word[2] == 'demand' || word[2] == 'd') {
          await bursalib.listTokenOrders(word[1], 0);
        }
        else if (word[2] == 'supply' || word[2] == 's') {
          await bursalib.listTokenOrders(word[1], 2);
        }
        else if (word.length > 3) {
          if (word[3] == 'demand' || word[3] == 'd') {
            await bursalib.listPairOrders(word[1], word[2], 2);
          }
          else if (word[3] == 'supply' || word[3] == 's') {
            await bursalib.listPairOrders(word[1], word[2], 0);
          }
        } else {
          await bursalib.listBothPairOrders(word[1], word[2]);
        }
      }
      else if (word.length > 1) {
        await bursalib.listBothTokenOrders(word[1]);
      }
      else {
        await bursalib.listAllOrders();
      }
    break;

    case 'o':
    case 'orders':
      if (word.length > 0) {
        await bursalib.listYourOrders();
      }
    break;

// 3.
    case 'u':
    case 'unlock':
      if (word.length > 1) {
        try {
          web3.eth.personal.unlockAccount(acc0, word[1]);
          console.log('Unlocking account ' + acc0 + '.');
        } catch (e) {
          console.log('Failed to unlock.');
        }
      } else {
        try {
          web3.eth.personal.unlockAccount(acc0, '');
          console.log('Unlocking account ' + acc0 + '.');
        } catch (e) {
          console.log('Failed to unlock.');
        }
      }
    break;

    case 'd':
    case 'deposit':
      if (word.length > 1) {
        await bursalib.depositEther(parseFloat(word[1]));
      }
    break;

    case 'balance':
    case 'balances':
      if (word.length == 1) {
        await bursalib.showBalance();
      }
    break;

    case 'w':
    case 'withdraw':
      if (word.length == 2) {
        await bursalub.withdrawEther(parseFloat(word[1]));
      }

// 4.
    case 'will':
      if (word[1] == 'buy' || word[1] == 'b') {
        if (word.length > 6) {
          var tokenGet = await bursalib.tokenFromSymbol(word[3]);
          var tokenGive = await bursalib.tokenFromSymbol(word[6]);
          if ((word[4] == 'price' || word[4] == 'at')) {
            var amountTokenGet = parseFloat(word[2]);
            var priceOfTokenGet = parseFloat(word[5]);
            await makeOrder(tokenGet, amountTokenGet, tokenGive, priceOfTokenGet * amountTokenGet);
          }
          else if (word[4] == 'for') {
            await makeOrder(tokenGet, parseFloat(word[2]), tokenGive, parseFloat(word[5]));
          }
        }
      }
      if (word[1] == 'sell' || word[1] == 's' ||
         word[1] == 'trade' || word[1] == 't') {
        if (word.length > 6) {
          var tokenGet = await bursalib.tokenFromSymbol(word[6]);
          var tokenGive = await bursalib.tokenFromSymbol(word[3]);
          if ((word[4] == 'price' || word[4] == 'at')) {
            var amountTokenGet = parseFloat(word[2]);
            var priceOfTokenGet = parseFloat(word[5]);
            await makeOrder(tokenGet, priceOfTokenGet * amountTokenGet, tokenGive, amountTokenGet);
          }
          else if (word[4] == 'for') {
            await makeOrder(tokenGet, parseFloat(word[5]), tokenGive, parseFloat(word[2]));
          }
        }
      }
    break;

    case 'b':
      if (word.length == 1) {
        await bursalib.showBalance();
        return;
      }
    case 'buy':
      // if (word.length > 5 && word[3] == 'price') {
      //   await matchTrade(word[5], parseFloat(word[4]), word[2], parseFloat(word[1]));
      // }
      // else
      if (word.length > 2) {
        await matchTrade('ether', 0, word[2], parseFloat(word[1]));
      }
    break;

    case 's':
    case 'sell':
      // if (word.length > 5 && word[3] == 'price') {
      //   await matchTrade(word[2], parseFloat(word[1]), word[5], parseFloat(word[4]));
      // }
      // else
      if (word.length > 2) {
        await matchTrade(word[2], parseFloat(word[1]), 'ether', 0);
      }
    break;

    case 't':
    case 'trade':
      if (word.length > 5 && word[3] == 'for') {
        await matchTrade(word[5], parseFloat(word[4]), word[2], parseFloat(word[1]));
      }
    break;

// 5.
    case 'gasprice':
      // if (word.length > 5 && word[3] == 'give') {
      //   var tokenGet = await tokenFromSymbol(word[2]);
      //   var tokenGive = await tokenFromSymbol(word[5]);
      //   await makeOrder(tokenGet, parseFloat(word[1]), tokenGive, parseFloat(word[4]));
      // }
    break;

    case 'c':
    case 'collect':
      // if (word.length > 5 && word[3] == 'give') {
      //   var tokenGet = await tokenFromSymbol(word[2]);
      //   var tokenGive = await tokenFromSymbol(word[5]);
      //   await makeOrder(tokenGet, parseFloat(word[1]), tokenGive, parseFloat(word[4]));
      // }
    break;

    default:
  }
}


var EventEmitter = require('events');
var prompt = new EventEmitter();
var current = null;
async function main() {
  console.log('Connecting to Ethereum network...');
  // try {
  async function connect() {
    web3 = bursalib.web3;
    // acc0 = bursalib.acc0;
    // gasPrice = bursalib.gasPrice;
    // data = bursalib.data;
    // console.log(acc0);
    acc = await web3.eth.getAccounts();
    web3.eth.defaultAccount = acc[0];
    acc0 = web3.eth.defaultAccount;
    web3.eth.coinbase = acc0;
    bursa = await new web3.eth.Contract(compiled.bursa_abi, deployed.bursa_address,
        { from: acc0, gasPrice: gasPrice });
  }
  await connect();

  console.log(bursalib.help0);

  process.stdin.resume();
  process.stdin.on('data', function(data) {
    prompt.emit(current, data.toString().trim());
    // process.stdout.write('> ');
  });
  prompt.on(':new', function(name) {
    current = name;
  });
  prompt.on(':end', function(){
    process.stdout.cursorTo(0)
    process.stdin.pause();
  });
  prompt.emit(':new', 'commander');
  prompt.on('commander', async function(data) {
    if (data.toString().trim() == "q" || data.toString().trim() == ":q" || data.toString().trim() == "quit" || data.toString().trim() == "exit") {
      prompt.emit(':end');
      return;
    }
    process.stdout.cursorTo(0)
    await parseInput(data);
    await prompt.emit(':new', 'commander');
  });
  // } catch (e) {
  //   console.log('Can\'t connect to Ethereum Web3');
  //   // console.log(e);
  // }
}
main();
