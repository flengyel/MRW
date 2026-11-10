"""Public source-plugin API 1 helpers. Parsers never receive saved-store objects."""
import re
from .source import SourceDocument
from .source_outlines import select_span
from .source_plugins import normalize,page_url,qualified

API_VERSION=1


def source_span(source,start,end):
    """Map half-open Unicode offsets into the original UTF-8 source revision."""
    value=source.text.removeprefix('\ufeff')
    if type(start) is not int or type(end) is not int or not 0<=start<end<=len(value):raise ValueError('Invalid exact source offsets')
    def point(offset):
        lines=re.split(r'\r\n|\r|\n',value[:offset]);return [len(lines)-1,len(lines[-1].encode('utf-16-le'))//2]
    return select_span(source,point(start),point(end))
