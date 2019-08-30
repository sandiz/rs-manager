//eslint-disable
import React from 'react'
import ReactDOM from 'react-dom'
import { I18nextProvider } from 'react-i18next';

import App from './App'
import i18n from './app-config/i18next.config.client';

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

const initialI18nStore = ipcRenderer.sendSync('get-initial-translations');
ipcRenderer.on('language-changed', (event, message) => {
    console.log("language-changed", message)
    if (!i18n.hasResourceBundle(message.language, message.namespace)) {
        i18n.addResourceBundle(message.language, message.namespace, message.resource);
    }
    i18n.changeLanguage(message.language);
});
electron.webFrame.setZoomFactor(0.9);


ReactDOM.render(
    <I18nextProvider i18n={i18n} initialI18nStore={initialI18nStore} initialLanguage="en">
        <App />
    </I18nextProvider>,
    document.getElementById('root'),
)
