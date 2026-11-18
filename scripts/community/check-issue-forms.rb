# Checks GitHub issue forms against the documented syntax rules that YAML parsing alone does not catch.
# Usage: ruby scripts/community/check-issue-forms.rb .github/ISSUE_TEMPLATE/*.yml
require 'yaml'

TYPES = %w[markdown textarea input dropdown checkboxes].freeze
errors = []

ARGV.each do |file|
  doc = YAML.safe_load(File.read(file))
  if File.basename(file) == 'config.yml'
    errors << "#{file}: blank_issues_enabled must be boolean" unless [true, false].include?(doc['blank_issues_enabled'])
    (doc['contact_links'] || []).each_with_index do |l, i|
      %w[name url about].each { |k| errors << "#{file}: contact_links[#{i}] missing #{k}" if l[k].to_s.strip.empty? }
      errors << "#{file}: contact_links[#{i}] url must be https" unless l['url'].to_s.start_with?('https://')
    end
    next
  end
  %w[name description body].each { |k| errors << "#{file}: missing top-level #{k}" unless doc.key?(k) }
  ids = []
  labels = []
  body = doc['body'] || []
  errors << "#{file}: body needs at least one non-markdown field" if body.none? { |b| b['type'] != 'markdown' }
  body.each_with_index do |item, i|
    where = "#{file}: body[#{i}]"
    type = item['type']
    errors << "#{where}: unknown type #{type.inspect}" unless TYPES.include?(type)
    attrs = item['attributes'] || {}
    if type == 'markdown'
      errors << "#{where}: markdown needs attributes.value" if attrs['value'].to_s.strip.empty?
      next
    end
    id = item['id']
    if id
      errors << "#{where}: id #{id} must use only letters, digits, - and _" unless id =~ /\A[A-Za-z0-9_-]+\z/
      errors << "#{where}: duplicate id #{id}" if ids.include?(id)
      ids << id
    end
    label = attrs['label'].to_s.strip
    errors << "#{where}: missing attributes.label" if label.empty?
    errors << "#{where}: duplicate label #{label}" if labels.include?(label)
    labels << label
    case type
    when 'dropdown'
      opts = attrs['options'] || []
      errors << "#{where}: dropdown needs options" if opts.empty?
      errors << "#{where}: dropdown options must be unique" if opts.uniq.size != opts.size
      errors << "#{where}: 'None' is a reserved option" if opts.map(&:to_s).include?('None')
    when 'checkboxes'
      opts = attrs['options'] || []
      errors << "#{where}: checkboxes need options" if opts.empty?
      opts.each { |o| errors << "#{where}: checkbox option missing label" if o['label'].to_s.strip.empty? }
    end
  end
  puts "#{file}: #{body.size} fields checked"
end

if errors.empty?
  puts 'issue forms: OK'
else
  puts errors
  exit 1
end
