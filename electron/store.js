const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class Store {
  constructor(filename, defaultData = {}) {
    const userDataPath = app ? app.getPath('userData') : path.join(__dirname, '..');
    this.path = path.join(userDataPath, filename);
    this.data = this.loadData(defaultData);
  }

  loadData(defaultData) {
    try {
      if (fs.existsSync(this.path)) {
        const raw = fs.readFileSync(this.path, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error(`Error loading store from ${this.path}:`, err);
    }
    return defaultData;
  }

  get(key) {
    return key ? this.data[key] : this.data;
  }

  set(key, val) {
    if (typeof key === 'object') {
      this.data = { ...this.data, ...key };
    } else {
      this.data[key] = val;
    }
    this.save();
  }

  save() {
    try {
      const dir = path.dirname(this.path);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Atomic write using temp file to prevent corruption
      const tempPath = `${this.path}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tempPath, this.path);
    } catch (err) {
      console.error(`Error saving store to ${this.path}:`, err);
    }
  }
}

module.exports = Store;
