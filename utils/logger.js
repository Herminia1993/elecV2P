const fs = require('fs')
const path = require('path')
const { now } = require('./time')
const { sString } = require('./string')

const { CONFIG } = require('../config')

const CONFIG_LOG = {
  levels: {
    error: 0,
    notify: 1,
    info: 2,
    debug: 3
  },
  alignHeadlen: 16,               // 日志头部长度
  globalLevel: CONFIG.gloglevel || 'info'
}

CONFIG_LOG.logspath = function(){
  const logFolder = path.join(__dirname, '../logs')
  if(!fs.existsSync(logFolder)) fs.mkdirSync(logFolder)
  return logFolder
}();

class logger {
  _head = 'elecV2P'
  _level = 'info'

  log = this.info
  err = this.error

  constructor({ head, level, isalignHead, cb, file }) {
    if(head) this._head = head
    if(CONFIG_LOG.levels.hasOwnProperty(level)) this._level = level
    if(cb) this._cb = cb
    if(file) this._file = /\.log/.test(file) ? file : file + '.log'

    if (isalignHead !== false) {
      this.infohead = alignHead(this._head + ' info')
      this.notifyhead = alignHead(this._head + ' notify')
      this.errorhead = alignHead(this._head + ' error')
      this.debughead = alignHead(this._head + ' debug')
    } else {
      this.infohead = this._head + ' info'
      this.notifyhead = this._head + ' notify'
      this.errorhead = this._head + ' error'
      this.debughead = this._head + ' debug'
    }
  }

  setcb(cb){
    this._cb = cb
  }

  info(){
    const args = formArgs(arguments)
    if (!args) return
    const cont = `[${ this.infohead }][${ now() }]: ${ args }`
    if (CONFIG_LOG.levels[this._level] >= CONFIG_LOG.levels['info'] && CONFIG_LOG.levels['info'] <= CONFIG_LOG.levels[CONFIG_LOG.globalLevel]) {
      console.log(cont)
    }
    if(this._cb) this._cb(cont)
    if(this._file) LOGFILE.put(this._file, cont)
  }

  notify(){
    const args = formArgs(arguments)
    if (!args) return
    const cont = `[${ this.notifyhead }][${ now() }]: ${ args }`
    if (CONFIG_LOG.levels[this._level] >= CONFIG_LOG.levels['notify'] && CONFIG_LOG.levels['notify'] <= CONFIG_LOG.levels[CONFIG_LOG.globalLevel]) {
      console.log(cont)
    }
    if(this._cb) this._cb(cont)
    if(this._file) LOGFILE.put(this._file, cont)
  }

  error(){
    const args = formArgs(arguments)
    if (!args) return
    const cont = `[${ this.errorhead }][${ now() }]: ${ args }`
    if (CONFIG_LOG.levels[this._level] >= CONFIG_LOG.levels['error'] && CONFIG_LOG.levels['error'] <= CONFIG_LOG.levels[CONFIG_LOG.globalLevel]) {
      console.error(cont)
    }
    if(this._cb) this._cb(cont)
    if(this._file) LOGFILE.put(this._file, cont)
    LOGFILE.put('errors.log', cont)
  }

  debug(){
    const args = formArgs(arguments)
    if (!args) return
    const cont = `[${ this.debughead }][${ now() }]: ${ args }`
    if (CONFIG_LOG.levels[this._level] >= CONFIG_LOG.levels['debug'] && CONFIG_LOG.levels['debug'] <= CONFIG_LOG.levels[CONFIG_LOG.globalLevel]) {
      console.log(cont)
      if(this._cb) this._cb(cont)
      if(this._file) LOGFILE.put(this._file, cont)
    }
  }
}

const clog = new logger({ head: 'logger', level: 'debug' })

const LOGFILE = {
  put(filename, data){
    if (!filename || !data) return
    fs.appendFile(path.join(CONFIG_LOG.logspath, filename.split('/').join('-')), sString(data) + '\n', (err) => {
      if (err) clog.error(err)
    })
  },
  get(filename){
    if (!filename) return
    if (filename === 'all') {
      return fs.readdirSync(CONFIG_LOG.logspath)
    }
    filename = filename.split('/').join('-')
    if (fs.existsSync(path.join(CONFIG_LOG.logspath, filename))) {
      return fs.readFileSync(path.join(CONFIG_LOG.logspath, filename), "utf8")
    }
    clog.info(filename, 'not exist yet')
    return null
  },
  delete(filename){
    if (filename == 'all') {
      fs.readdirSync(CONFIG_LOG.logspath).forEach(file=>{
        clog.notify('delete log file:', file)
        fs.unlinkSync(path.join(CONFIG_LOG.logspath, file))
      })
      return true
    }
    if (fs.existsSync(path.join(CONFIG_LOG.logspath, filename))){
      clog.notify('delete log file', filename)
      fs.unlinkSync(path.join(CONFIG_LOG.logspath, filename))
      return true
    } 
    return false
  }
}

function formArgs(args) {
  try {
    args = [...args]
    if (args.length) {
      return args.filter(arg=>arg).map(arg=>sString(arg)).join(' ')
    }
    return ''
  } catch(e) {
    clog.error('wrong arguments')
    return 'there are some error in logs arguments'
  }
}

function alignHead(head) {
  if (head.length === CONFIG_LOG.alignHeadlen) return head
  if (head.length < CONFIG_LOG.alignHeadlen) {
    let nstr = head.split(' ')
    let space = CONFIG_LOG.alignHeadlen - head.length
    while(space--){
      nstr[0] += ' '
    }
    return nstr.join(' ')
  }
  if (head.length > CONFIG_LOG.alignHeadlen) {
    const sp = head.split('/')
    if (sp.length > 1) head = sp[0].slice(0,1) + '/' + sp.pop()
    const nstr = head.split(' ').pop()
    return head.slice(0, CONFIG_LOG.alignHeadlen-6-nstr.length) + '...' + head.slice(-nstr.length-3)
  }
}

function setGlog(level) {
  if(CONFIG_LOG.levels.hasOwnProperty(level)) {
    CONFIG_LOG.globalLevel = level
    clog.notify('全局日志级别调整为', level)
  } else {
    clog.error('非法 level', level, '全局日志级别调整失败')
  }
}

module.exports = { logger, setGlog, LOGFILE }