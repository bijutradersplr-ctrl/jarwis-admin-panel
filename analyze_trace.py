import gzip
import json
import collections
import sys

trace_path = r"C:\Users\biju\Downloads\Trace-20260224T114214.json.gz"
output_path = r"C:\Users\biju\Downloads\New Test Software\jarwis-web\trace_analysis_utf8.txt"

try:
    with gzip.open(trace_path, 'rt', encoding='utf-8') as f:
        data = json.load(f)
except Exception as e:
    print(f"Error loading trace: {e}")
    sys.exit(1)

events = data if isinstance(data, list) else data.get('traceEvents', [])

durations = collections.defaultdict(float)
counts = collections.defaultdict(int)

long_tasks = []

for ev in events:
    dur = ev.get('dur', 0) / 1000.0 # ms
    
    if ev.get('ph') in ['X', 'B']: # Complete events or Begin events with duration
        name = ev.get('name', 'Unknown')
        args = ev.get('args', {})
        
        # strip control chars
        name = "".join([c for c in name if ord(c) > 31])
        
        if name == 'FunctionCall' and 'data' in args:
            data = args['data']
            if 'functionName' in data:
                name = f"FunctionCall: {data['functionName']}"
        elif name == 'EventDispatch' and 'data' in args:
            name = f"EventDispatch: {args['data'].get('type', '')}"
        elif name == 'EvaluateScript' and 'data' in args:
            name = f"EvaluateScript: {args['data'].get('url', '').split('/')[-1]}"
            
        durations[name] += dur
        counts[name] += 1
        
        if dur > 50:
            long_tasks.append((dur, name, args))

with open(output_path, 'w', encoding='utf-8') as out:
    out.write(f"Total events analyzed: {len(events)}\n")
    
    out.write("\nTop 20 most time-consuming event types/functions (Total ms):\n")
    sorted_durations = sorted(durations.items(), key=lambda x: x[1], reverse=True)
    for k, v in sorted_durations[:20]:
        out.write(f"{k}: {v:.2f} ms (Count: {counts[k]})\n")
    
    out.write("\nTop 40 longest individual tasks (>50ms):\n")
    long_tasks.sort(key=lambda x: x[0], reverse=True)
    for dur, name, args in long_tasks[:40]:
        args_str = str(args)[:150] + ('...' if len(str(args)) > 150 else '')
        args_str = "".join([c for c in args_str if ord(c) > 31])
        out.write(f"{dur:.2f} ms | {name} | Args: {args_str}\n")
    
print("Done writing to trace_analysis_utf8.txt")
