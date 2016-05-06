const gulp = require('gulp')
const plugins = require('gulp-load-plugins')()
const del = require('del')
const mkdirp = require('mkdirp')
const path = require('path')

const pkg = require('./package.json')
const dest = path.dirname(pkg.main)

gulp.task('clean', function () {
  del.sync([dest])
})

gulp.task('build', function () {
  mkdirp.sync(dest)
  return gulp.src('src/**/*.js')
    .pipe(plugins.plumber({
      errorHandler: plugins.notify.onError('<%= error.message %>')
    }))
    .pipe(plugins.babel())
    .pipe(gulp.dest(dest))
})

gulp.task('watch', function () {
  gulp.watch(['src/**/*'], ['build'])
})

gulp.task('default', ['build'], function () {
  gulp.start('watch')
})
