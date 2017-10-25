export default {
    input: 'ngx-multi-window.js',
    output: {
        file: 'bundles/ngx-multi-window.umd.js',
        format: 'umd'
    },
    external: [
        '@angular/core',
        '@angular/router',
        '@angular/platform-browser',
        '@angular/common',
        'rxjs'
    ],
    globals: {
        '@angular/core': 'ng.core',
        '@angular/platform-browser': 'ng.platform-browser',
        '@angular/common': 'ng.common',
        'rxjs': 'rxjs'
    },
    name: 'ngx.multi.window'
}
