"""Minimal external adapter, installed separately from MRW's VSIX.

This example uses Kerodon's public HTML as a working acquisition case. Replace
parse with a parser for your own format; the store and reader remain core-owned.
"""
from mrw.source_adapters import ProfileAdapter


class Adapter(ProfileAdapter):
    def __init__(self):
        super().__init__(dict(apiVersion=1,pluginId='example.python-adapter',pluginVersion='1.0.0',
            sourceId='adapter-example',name='External Python adapter example',parser='gerby-html-v1',
            origins=['https://kerodon.net'],urlRules=dict(identifier='tag',itemPath='/tag/{id}',revisionPath=None),
            capabilities=dict(onlineView=True,savedImport=True,sectionSelection=False,revisionLookup=False),
            attribution=dict(authors='Jacob Lurie',license='No license statement supplied by the retrieved page',url='https://kerodon.net')))
