import uglify from 'rollup-plugin-uglify';

export default {
    input: 'ngx-multi-window.js',
    output: {
        file: 'bundles/ngx-multi-window.umd.min.js',
        format: 'umd',
        name: 'ngx.multi.window',
        globals: {
            '@angular/core': 'ng.core',
            '@angular/platform-browser': 'ng.platform-browser',
            '@angular/common': 'ng.common',
            'rxjs': 'Rx',
            'rxjs/operators': 'Rx'
        },
    },
    external: [
        '@angular/core',
        '@angular/router',
        '@angular/platform-browser',
        '@angular/common',
        'rxjs',
        'rxjs/operators'
    ],
    plugins: [
        uglify()
    ]
}
