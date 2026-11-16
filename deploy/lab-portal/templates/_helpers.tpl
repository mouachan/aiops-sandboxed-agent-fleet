{{- define "lab-portal.labels" -}}
app.kubernetes.io/name: lab-portal
app.kubernetes.io/part-of: nemoclaw
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{- end -}}

{{- define "lab-portal.host" -}}
{{- if .Values.host -}}
{{- .Values.host -}}
{{- else -}}
{{- printf "join.%s" (required "clusterAppsDomain is required (or set host)" .Values.clusterAppsDomain) -}}
{{- end -}}
{{- end -}}
