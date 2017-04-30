import uglify from 'rollup-plugin-uglify';

export default {
    entry     : 'ng2-multi-window.js',
    dest      : 'bundles/ng2-multi-window.umd.min.js',
    format    : 'umd',
    external  : [
        '@angular/core',
        '@angular/router',
        '@angular/platform-browser',
        '@angular/common'
    ],
    globals   : {
        '@angular/core': 'ng.core',
        '@angular/platform-browser': 'ng.platform-browser',
        '@angular/common': 'ng.common'
    },
    moduleName: 'ng2.multi.window',
    plugins: [
        uglify()
    ]
}
