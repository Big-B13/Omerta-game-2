import pathlib
s = pathlib.Path('src')
t = (s / 'template.html').read_text()
t = t.replace('/*CSS*/', (s / 'style.css').read_text())
t = t.replace('/*ENGINE2*/', (s / 'engine2.js').read_text())
t = t.replace('/*ENGINE*/', (s / 'engine.js').read_text())
t = t.replace('/*UI*/', (s / 'ui2.js').read_text())
pathlib.Path('index.html').write_text(t)
print('built', len(t))
